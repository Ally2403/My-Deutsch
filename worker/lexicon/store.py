"""Consulta del léxico SQLite (ADR-003): formas → lema y entradas con género y acepciones."""

import json
import sqlite3
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class Entry:
    lemma: str
    pos: str
    genders: list[str]
    plural: str | None
    glosses_en: list[str]
    glosses_es: list[str]


class Lexicon:
    def __init__(self, path: Path):
        self._db = sqlite3.connect(f"file:{path}?mode=ro", uri=True, check_same_thread=False)
        self.lookup_form = lru_cache(maxsize=50_000)(self._lookup_form)

    def _lookup_form(self, form: str) -> set[tuple[str, str]]:
        rows = self._db.execute("SELECT lemma, pos FROM forms WHERE form = ?", (form,))
        return {(lemma, pos) for lemma, pos in rows}

    def is_lemma(self, word: str) -> bool:
        row = self._db.execute("SELECT 1 FROM entries WHERE lemma = ? LIMIT 1", (word,)).fetchone()
        return row is not None

    def entry(self, lemma: str, pos: str) -> Entry | None:
        row = self._db.execute(
            "SELECT genders, plural, glosses_en, glosses_es "
            "FROM entries WHERE lemma = ? AND pos = ?",
            (lemma, pos),
        ).fetchone()
        if row is None:
            return None
        genders, plural, en, es = row
        return Entry(lemma, pos, json.loads(genders), plural, json.loads(en), json.loads(es))

    def close(self) -> None:
        self._db.close()
