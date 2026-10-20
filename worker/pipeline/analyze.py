"""Tipo de palabra, lema, forma y verbos separables de cada token (RF-12, RF-23, RF-24)."""

import re
from dataclasses import dataclass, replace

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
    sent_start: bool = False  # el token abre una oración según spaCy (RF-47)


def form_tag(
    morph: dict[str, str], pos: str, text: str, lemma: str, plural: str | None = None
) -> str | None:
    """Etiqueta de la forma del token respecto a su lema, o None si es la forma base."""
    if pos == "noun" and morph.get("Number") == "Plur":
        return "pl"  # también si coincide con el singular (die Lehrer) o es solo plural
    if pos == "noun" and plural and text == plural and text != lemma:
        return "pl"  # el plural de Wiktionary vale aunque spaCy no reconozca el número
    if text.lower() == lemma.lower():
        return None
    if pos == "verb":
        if morph.get("VerbForm") == "Part":
            return "part"
        if morph.get("VerbForm") == "Fin" and morph.get("Tense") == "Past":
            return "pret"
        if morph.get("VerbForm") == "Fin" and morph.get("Tense") == "Pres":
            return "pres"
    elif pos == "adj":
        if morph.get("Degree") == "Cmp":
            return "comp"
        if morph.get("Degree") == "Sup":
            return "sup"
        if morph.get("VerbForm") == "Part":
            return "part"
    return None


SEPARABLE_PARTICLES = frozenset(
    [
        "ab",
        "an",
        "auf",
        "aus",
        "bei",
        "dar",
        "durch",
        "ein",
        "empor",
        "entgegen",
        "fern",
        "fest",
        "fort",
        "frei",
        "gegenüber",
        "heim",
        "her",
        "herab",
        "heran",
        "herauf",
        "heraus",
        "herein",
        "herum",
        "herunter",
        "hin",
        "hinaus",
        "hinein",
        "hinunter",
        "hinzu",
        "hoch",
        "los",
        "mit",
        "nach",
        "nahe",
        "nieder",
        "offen",
        "statt",
        "teil",
        "um",
        "unter",
        "vor",
        "voran",
        "voraus",
        "vorbei",
        "vorüber",
        "weg",
        "weiter",
        "wieder",
        "zu",
        "zurück",
        "zusammen",
        "zwischen",
        "über",
    ]
)
CLAUSE_END = re.compile(r"[,;:.!?]$")


def trailing_particle_pairs(
    raws: list[str],
    cores: list[str],
    lemmas: list[str | None],
    finite: list[bool],
    sent_start: list[bool],
    lex,
) -> list[tuple[int, int, str]]:
    """Respaldo de RN-07 cuando spaCy no marca `svp`: una partícula que cierra la cláusula
    (última palabra de la oración o seguida de coma) se une al verbo conjugado más cercano
    de la misma cláusula si el compuesto existe como verbo en el léxico.
    Devuelve (índice del verbo, índice de la partícula, lema compuesto)."""
    pairs: list[tuple[int, int, str]] = []
    used: set[int] = set()
    for p, core in enumerate(cores):
        particle = core.lower()
        if particle not in SEPARABLE_PARTICLES or p == 0:
            continue
        closes = p == len(cores) - 1 or bool(CLAUSE_END.search(raws[p]))
        if not closes or p in used:
            continue
        for v in range(p - 1, -1, -1):
            if CLAUSE_END.search(raws[v]):
                break  # la cláusula anterior termina en v
            if finite[v] and lemmas[v] and v not in used:
                compound = particle + lemmas[v].lower()
                if "verb" in lex.pos_of(compound):
                    pairs.append((v, p, compound))
                    used.update((v, p))
                    break
            if sent_start[v]:
                break
    return pairs


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
        entry = lex.entry(lemma, pos) if pos == "noun" else None
        plural = entry.plural if entry else None
        form = form_tag(tok.morph.to_dict(), pos, core, lemma, plural) if pos else None
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

    linked = {i for i, a in enumerate(result) if a.sep is not None}
    lemmas = [a.lemma for a in result]
    finite = [t.pos_ in ("VERB", "AUX") and t.morph.to_dict().get("VerbForm") == "Fin" for t in doc]
    raws = [t.text for t in tokens]
    starts = [t.is_sent_start is True or t.i == 0 for t in doc]
    for v, p, compound in trailing_particle_pairs(raws, cores, lemmas, finite, starts, lex):
        if v in linked or p in linked:
            continue
        for idx, other in ((v, p), (p, v)):
            old = result[idx]
            result[idx] = Analyzed(compound, "verb", old.form, other)
    return [replace(a, sent_start=s) for a, s in zip(result, starts, strict=True)]
