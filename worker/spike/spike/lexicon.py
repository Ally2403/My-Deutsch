"""Formas flexionadas → lema con la tabla de formas de Wiktionary (RF-23, ADR-003)."""

import gzip
import json
from dataclasses import dataclass, field
from pathlib import Path

SKIP_TAGS = {"table-tags", "inflection-template", "auxiliary", "class"}
POS = {  # spaCy (UD) → tipos de kaikki compatibles
    "NOUN": {"noun", "name"},
    "PROPN": {"name", "noun"},
    "VERB": {"verb"},
    "AUX": {"verb"},
    "ADJ": {"adj", "verb"},  # participios usados como adjetivo
    "ADV": {"adv", "adj"},
    "DET": {"article", "det", "pron", "num"},
    "PRON": {"pron", "article", "det"},
    "NUM": {"num", "adj"},
}


@dataclass
class FormIndex:
    forms: dict[str, set[tuple[str, str]]] = field(default_factory=dict)  # forma → {(lema, tipo)}
    lemmas: set[str] = field(default_factory=set)

    def add(self, form: str, lemma: str, pos: str) -> None:
        self.forms.setdefault(form, set()).add((lemma, pos))

    @classmethod
    def from_kaikki(cls, path: Path) -> "FormIndex":
        index = cls()
        with gzip.open(path, "rt", encoding="utf-8") as f:
            for line in f:
                e = json.loads(line)
                word, pos = e.get("word"), e.get("pos")
                if not word or not pos:
                    continue
                senses = e.get("senses", [])
                if senses and all("alt-of" in s.get("tags", []) for s in senses):
                    continue  # grafía antigua o regional (Schloß, reissen)
                form_of = {fo["word"] for s in senses for fo in s.get("form_of", [])}
                if form_of:  # entrada que solo es una forma flexionada de otra
                    for lemma in form_of:
                        index.add(word, lemma, pos)
                    continue
                index.lemmas.add(word)
                index.add(word, word, pos)
                for fm in e.get("forms", []):
                    form = fm.get("form", "")
                    if form and " " not in form and not SKIP_TAGS & set(fm.get("tags", [])):
                        index.add(form, word, pos)
        return index


ADJ_ENDINGS = ("em", "en", "er", "es", "e")


def _pick(pool: set[str], text: str, spacy_lemma: str) -> str:
    for guess in (spacy_lemma, spacy_lemma.lower(), text, text.lower()):
        if guess in pool:
            return guess
    return min(pool, key=lambda lemma: (lemma == text, len(lemma), lemma))


def _from_table(text: str, spacy_pos: str, spacy_lemma: str, index: FormIndex) -> str | None:
    wanted = POS.get(spacy_pos, set())
    exact = index.forms.get(text, set())
    lower = index.forms.get(text.lower(), set()) if text != text.lower() else set()
    for candidates in (exact, lower):
        compatible = {lemma for lemma, pos in candidates if pos in wanted}
        if compatible:
            return _pick(compatible, text, spacy_lemma)
    anything = {lemma for lemma, _ in exact | lower}
    return _pick(anything, text, spacy_lemma) if anything else None


def _compound(text: str, index: FormIndex) -> str | None:
    """Kunstschätze → Kunst + Schätze → Kunstschatz (cabeza más larga conocida, ≥ 3 letras)."""
    for cut in range(1, len(text) - 2):
        head = text[cut:].capitalize()
        lemmas = {lemma for lemma, pos in index.forms.get(head, set()) if pos == "noun"}
        if lemmas and text[:cut].isalpha():
            return text[:cut] + _pick(lemmas, head, head).lower()
    return None


def resolve(text: str, spacy_pos: str, spacy_lemma: str, index: FormIndex) -> str:
    """Lema de `text`: (a) tabla de formas, filtrada por el tipo de spaCy; (b) lema de spaCy
    si existe en el léxico; (c) reglas de respaldo (zu-infinitivo, terminación de adjetivo,
    compuestos); (d) la propia forma."""
    found = _from_table(text, spacy_pos, spacy_lemma, index)
    if found:
        return found
    for guess in (spacy_lemma, spacy_lemma.lower()):
        if guess in index.lemmas:
            return guess
    if spacy_pos in ("VERB", "AUX") and "zu" in text[1:]:
        i = text.index("zu", 1)
        joined, tail = text[:i] + text[i + 2 :], text[i + 2 :]
        if joined in index.lemmas or tail in index.lemmas:
            return joined
    if spacy_pos in ("ADJ", "ADV"):
        for ending in ADJ_ENDINGS:
            stem = text[: -len(ending)]
            # la raíz puede ser un lema (halblang) o un participio (abgestimmt, strotzend)
            if text.endswith(ending) and (stem in index.lemmas or stem in index.forms):
                return stem
    if spacy_pos in ("NOUN", "PROPN") and (head := _compound(text, index)):
        return head
    return text
