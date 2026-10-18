"""Formas flexionadas → (lema, tipo) con el léxico de Wiktionary (RF-23, ADR-003).

Orden: (a) tabla de formas filtrada por el tipo de spaCy; (b) lema de spaCy si existe en el
léxico; (c) reglas de respaldo (zu-infinitivo, terminación de adjetivo, compuestos); (d) la
propia forma sin tipo. Resultado del spike: 97,4 % en 307 formas (docs/spike-fase-2.md).
"""

from lexicon.store import Entry, Lexicon

POS = {  # spaCy (UD) → tipos del JSON compatibles, en orden de preferencia
    "NOUN": ["noun", "propn"],
    "PROPN": ["propn", "noun"],
    "VERB": ["verb"],
    "AUX": ["verb"],
    "ADJ": ["adj", "verb"],  # participios usados como adjetivo
    "ADV": ["adv", "adj"],
    "DET": ["det", "pron", "num"],
    "PRON": ["pron", "det"],
    "NUM": ["num", "adj"],
    "ADP": ["prep"],
    "CCONJ": ["conj"],
    "SCONJ": ["conj"],
    "PART": ["part"],
    "INTJ": ["intj"],
}
ADJ_ENDINGS = ("em", "en", "er", "es", "e")


def _pick(pool: set[str], text: str, spacy_lemma: str) -> str:
    for guess in (spacy_lemma, spacy_lemma.lower(), text, text.lower()):
        if guess in pool:
            return guess
    return min(pool, key=lambda lemma: (lemma == text, len(lemma), lemma))


def _pos_for(lemma: str, wanted: list[str], lex: Lexicon) -> str | None:
    available = lex.pos_of(lemma)
    for pos in wanted:
        if pos in available:
            return pos
    return available[0] if available else None


def _from_table(text: str, wanted: list[str], spacy_lemma: str, lex: Lexicon):
    exact = lex.lookup_form(text)
    lower = lex.lookup_form(text.lower()) if text != text.lower() else set()
    for candidates in (exact, lower):
        compatible = {lemma for lemma, pos in candidates if pos in wanted}
        if compatible:
            lemma = _pick(compatible, text, spacy_lemma)
            pos = next(p for w in wanted for lm, p in candidates if lm == lemma and p == w)
            return lemma, pos
    anything = exact | lower
    if anything:
        lemma = _pick({lm for lm, _ in anything}, text, spacy_lemma)
        return lemma, min(p for lm, p in anything if lm == lemma)
    return None


def _compound_parts(text: str, lex: Lexicon) -> tuple[str, str] | None:
    """Kunstschätze → («Kunst», «Schatz»): cabeza más larga conocida, de ≥ 3 letras."""
    for cut in range(1, len(text) - 2):
        head = text[cut:].capitalize()
        lemmas = {lemma for lemma, pos in lex.lookup_form(head) if pos == "noun"}
        if lemmas and text[:cut].isalpha():
            return text[:cut], _pick(lemmas, head, head)
    return None


def _compound(text: str, lex: Lexicon) -> str | None:
    parts = _compound_parts(text, lex)
    return parts[0] + parts[1].lower() if parts else None


def compound_entry(lemma: str, lex: Lexicon) -> Entry | None:
    """Entrada de un sustantivo compuesto sin entrada propia: en alemán el género y el plural
    son los de su última palabra (Kunst|schatz → der, Kunstschätze). Sin acepciones propias."""
    if lex.is_lemma(lemma):
        return None
    parts = _compound_parts(lemma, lex)
    head = lex.entry(parts[1], "noun") if parts else None
    if parts is None or head is None:
        return None
    plural = parts[0] + head.plural[0].lower() + head.plural[1:] if head.plural else None
    return Entry(lemma, "noun", list(head.genders), plural, [], [])


def resolve(text: str, spacy_pos: str, spacy_lemma: str, lex: Lexicon) -> tuple[str, str | None]:
    wanted = POS.get(spacy_pos, [])
    found = _from_table(text, wanted, spacy_lemma, lex)
    if found:
        return found
    for guess in (spacy_lemma, spacy_lemma.lower()):
        if lex.is_lemma(guess):
            return guess, _pos_for(guess, wanted, lex)
    if spacy_pos in ("VERB", "AUX") and "zu" in text[1:]:
        i = text.index("zu", 1)
        joined, tail = text[:i] + text[i + 2 :], text[i + 2 :]
        if lex.is_lemma(joined) or lex.is_lemma(tail):
            return joined, _pos_for(joined, wanted, lex)
    if spacy_pos in ("ADJ", "ADV"):
        for ending in ADJ_ENDINGS:
            stem = text[: -len(ending)]
            # la raíz puede ser un lema (halblang) o un participio (abgestimmt, strotzend)
            if text.endswith(ending) and (lex.is_lemma(stem) or lex.lookup_form(stem)):
                return stem, _pos_for(stem, wanted, lex)
    if spacy_pos in ("NOUN", "PROPN") and (head := _compound(text, lex)):
        return head, "noun"
    return text, None
