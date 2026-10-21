"""RF-51: añade `sents` a un JSON de página ya publicado, sin el PDF ni la imagen."""

from collections.abc import Callable

from lexicon.translate import Translator
from pipeline.analyze import Analyzed, sentence_starts
from pipeline.geometry import RawToken
from pipeline.page_json import MAX_SENTS, build_sents, sentence_ranges, validate_page


class UpgradeError(Exception):
    """La página no se pudo actualizar; `code` es lo único que se registra."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def _index_ranges(ranges: list[list[int]], count: int) -> list[int]:
    out = [0] * count
    for i, (a, b) in enumerate(ranges):
        for k in range(a, b + 1):
            out[k] = i
    return out


def raw_tokens(page: dict) -> list[RawToken]:
    """Reconstruye los tokens del OCR a partir del JSON (texto, cajas, línea y párrafo)."""
    toks = page["tokens"]
    line = _index_ranges(page["lines"], len(toks))
    par = _index_ranges(page["paragraphs"], len(toks))
    return [
        RawToken(
            text=t["t"],
            box=tuple(t["b"]),
            box2=tuple(t["b2"]) if "b2" in t else None,
            conf=float(t.get("c", 1)) * 100,
            line=line[i],
            par=par[i],
        )
        for i, t in enumerate(toks)
    ]


def upgrade_page(
    page: dict,
    nlp,
    translator: Translator,
    *,
    starts: Callable[[list[RawToken], object], list[bool]] = sentence_starts,
) -> dict | None:
    """Página nueva con `sents`, o None si ya los tenía con la segmentación vigente (idempotente).
    Las oraciones que una versión anterior juntó (versión 2, sin cortar por puntuación) se
    recalculan. No modifica la entrada. Una traducción vacía en una página con texto es un fallo."""
    try:
        validate_page(page)
    except ValueError:
        raise UpgradeError("invalid_page") from None
    tokens = raw_tokens(page)
    flags = starts(tokens, nlp)
    analyzed = [Analyzed(None, None, None, None, sent_start=f) for f in flags]
    if "sents" in page:
        wanted = [
            r
            for r in sentence_ranges(tokens, analyzed)
            if any(c.isalpha() for tk in tokens[r[0] : r[1] + 1] for c in tk.text)
        ][:MAX_SENTS]
        have = [s["r"] for s in page["sents"]]
        if have == wanted[: len(have)]:
            return None
    sents = build_sents(tokens, analyzed, translator)
    has_text = any(c.isalpha() for t in tokens for c in t.text)
    if has_text and not sents:
        raise UpgradeError("no_translation")
    out = {**page, "sents": sents}
    try:
        validate_page(out)
    except ValueError:
        raise UpgradeError("invalid_result") from None
    return out
