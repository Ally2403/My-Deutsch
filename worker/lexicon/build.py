"""Construye el léxico SQLite desde el volcado alemán de kaikki.org (ADR-003).

Uso: python -m lexicon.build volcado.jsonl.gz salida.sqlite
Se hace una sola vez y se guarda en caché; el worker solo consulta.
"""

import gzip
import json
import sqlite3
import sys
from dataclasses import dataclass, field
from pathlib import Path

MAX_GLOSSES = 5
SKIP_TAGS = {"table-tags", "inflection-template", "auxiliary", "class"}
GENDER = {"masculine": "m", "feminine": "f", "neuter": "n"}
POS = {  # tipos de kaikki → tipos del JSON de página (docs/04)
    "noun": "noun",
    "name": "propn",
    "verb": "verb",
    "adj": "adj",
    "adv": "adv",
    "prep": "prep",
    "postp": "prep",
    "pron": "pron",
    "det": "det",
    "article": "det",
    "conj": "conj",
    "num": "num",
    "particle": "part",
    "intj": "intj",
}


@dataclass
class _Agg:
    genders: list[str] = field(default_factory=list)
    plural: str | None = None
    en: list[str] = field(default_factory=list)
    es: list[str] = field(default_factory=list)


def _open(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return open(path, encoding="utf-8")


def _add_unique(target: list[str], values: list[str]) -> None:
    for v in values:
        if v and v not in target and len(target) < MAX_GLOSSES:
            target.append(v)


def _plural(forms: list[dict]) -> str | None:
    for fm in forms:
        tags = set(fm.get("tags", []))
        form = fm.get("form", "")
        if (
            "plural" in tags
            and not tags & {"diminutive", "table-tags"}
            and form
            and " " not in form
        ):
            return form
    return None


def build_lexicon(dump: Path, out: Path) -> None:
    out.unlink(missing_ok=True)
    db = sqlite3.connect(out)
    db.executescript(
        """
        CREATE TABLE forms (form TEXT NOT NULL, lemma TEXT NOT NULL, pos TEXT NOT NULL);
        CREATE TABLE entries (
            lemma TEXT NOT NULL, pos TEXT NOT NULL, genders TEXT NOT NULL, plural TEXT,
            glosses_en TEXT NOT NULL, glosses_es TEXT NOT NULL, PRIMARY KEY (lemma, pos)
        );
        """
    )
    form_rows: set[tuple[str, str, str]] = set()
    entries: dict[tuple[str, str], _Agg] = {}

    with _open(dump) as f:
        for line in f:
            e = json.loads(line)
            word, raw_pos = e.get("word"), e.get("pos")
            pos = POS.get(raw_pos or "")
            if not word or not pos:
                continue
            senses = e.get("senses", [])
            if senses and all("alt-of" in s.get("tags", []) for s in senses):
                continue  # grafía antigua o regional (Schloß, reissen)
            form_of = {fo["word"] for s in senses for fo in s.get("form_of", [])}
            if form_of:  # la entrada solo es una forma flexionada de otra
                form_rows.update((word, lemma, pos) for lemma in form_of)
                continue

            agg = entries.setdefault((word, pos), _Agg())
            form_rows.add((word, word, pos))
            for fm in e.get("forms", []):
                form = fm.get("form", "")
                if form and " " not in form and not SKIP_TAGS & set(fm.get("tags", [])):
                    form_rows.add((form, word, pos))
            if pos == "noun":
                tags = [t for s in senses for t in s.get("tags", [])]
                for t in tags:
                    if t in GENDER and GENDER[t] not in agg.genders:
                        agg.genders.append(GENDER[t])
                if "plural-only" in tags:
                    agg.genders = []
                elif agg.plural is None:
                    agg.plural = _plural(e.get("forms", []))
            _add_unique(agg.en, [s["glosses"][-1] for s in senses if s.get("glosses")])
            _add_unique(
                agg.es,
                [t["word"] for t in e.get("translations", []) if t.get("lang_code") == "es"],
            )

    db.executemany("INSERT INTO forms VALUES (?, ?, ?)", sorted(form_rows))
    db.executemany(
        "INSERT INTO entries VALUES (?, ?, ?, ?, ?, ?)",
        (
            (
                lemma,
                pos,
                json.dumps(a.genders),
                a.plural,
                json.dumps(a.en, ensure_ascii=False),
                json.dumps(a.es, ensure_ascii=False),
            )
            for (lemma, pos), a in sorted(entries.items())
        ),
    )
    db.execute("CREATE INDEX forms_form ON forms (form)")
    db.commit()
    db.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Uso: python -m lexicon.build volcado.jsonl.gz salida.sqlite")
    build_lexicon(Path(sys.argv[1]), Path(sys.argv[2]))
