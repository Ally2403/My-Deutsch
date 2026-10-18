"""Tipo de palabra, lema, forma y verbos separables de cada token (RF-12, RF-23, RF-24)."""

import re
from dataclasses import dataclass

from lexicon.resolve import resolve
from lexicon.store import Lexicon
from pipeline.geometry import RawToken

EDGE_PUNCT = re.compile(r"^[^\w]+|[^\w]+$")


@dataclass(frozen=True)
class Analyzed:
    lemma: str | None
    pos: str | None
    form: str | None  # etiqueta de forma respecto al lema: pret|part|pres|pl|comp|sup
    sep: int | None  # índice del token pareja de un verbo separable


def form_tag(morph: dict[str, str], pos: str, text: str, lemma: str) -> str | None:
    """Etiqueta de la forma del token respecto a su lema, o None si es la forma base."""
    if text.lower() == lemma.lower():
        return None
    if pos == "verb":
        if morph.get("VerbForm") == "Part":
            return "part"
        if morph.get("VerbForm") == "Fin" and morph.get("Tense") == "Past":
            return "pret"
        if morph.get("VerbForm") == "Fin" and morph.get("Tense") == "Pres":
            return "pres"
    elif pos == "noun" and morph.get("Number") == "Plur":
        return "pl"
    elif pos == "adj":
        if morph.get("Degree") == "Cmp":
            return "comp"
        if morph.get("Degree") == "Sup":
            return "sup"
        if morph.get("VerbForm") == "Part":
            return "part"
    return None


def _core(text: str) -> str:
    return EDGE_PUNCT.sub("", text) or text


def analyze(tokens: list[RawToken], nlp, lex: Lexicon) -> list[Analyzed]:
    """Analiza una página. spaCy recibe un token por palabra del OCR, sin la puntuación
    exterior, para que los índices coincidan con los de `tokens`."""
    if not tokens:
        return []
    from spacy.tokens import Doc

    cores = [_core(t.text) for t in tokens]
    doc = Doc(nlp.vocab, words=cores, spaces=[True] * len(cores))
    for _, proc in nlp.pipeline:
        doc = proc(doc)

    result: list[Analyzed] = []
    for i, tok in enumerate(doc):
        core = cores[i]
        if not any(c.isalpha() for c in core):
            result.append(Analyzed(None, None, None, None))
            continue
        lemma, pos = resolve(core, tok.pos_, tok.lemma_, lex)
        form = form_tag(tok.morph.to_dict(), pos, core, lemma) if pos else None
        result.append(Analyzed(lemma, pos, form, None))

    # RN-07: la partícula separada (relación `svp`) y su verbo comparten el lema compuesto.
    for i, tok in enumerate(doc):
        head = tok.head
        if tok.dep_ != "svp" or head.i == i or head.pos_ not in ("VERB", "AUX"):
            continue
        compound = cores[i].lower() + head.lemma_.lower()
        if not lex.is_lemma(compound):
            compound = result[head.i].lemma if result[head.i].lemma else None
            if compound is None:
                continue
        for idx, other in ((i, head.i), (head.i, i)):
            old = result[idx]
            result[idx] = Analyzed(compound, "verb", old.form, other)
    return result
