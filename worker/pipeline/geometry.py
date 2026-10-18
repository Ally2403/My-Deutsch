"""Filas de Tesseract → palabras con cajas relativas → tokens con guiones unidos (RF-12, RF-39)."""

from collections.abc import Callable
from dataclasses import dataclass

from pipeline.hyphen import join_hyphenated

Box = tuple[float, float, float, float]


@dataclass(frozen=True)
class Word:
    text: str
    box: Box  # [x, y, ancho, alto] relativos a la página (0–1)
    conf: float
    line: int  # índice denso de línea, en orden de lectura
    par: int  # índice denso de párrafo


@dataclass(frozen=True)
class RawToken:
    text: str
    box: Box
    box2: Box | None  # segunda parte de una palabra cortada con guion
    conf: float
    line: int
    par: int


def _rel(left: float, top: float, w: float, h: float, width: int, height: int) -> Box:
    x = min(max(left / width, 0.0), 1.0)
    y = min(max(top / height, 0.0), 1.0)
    return (
        round(x, 4),
        round(y, 4),
        round(min(w / width, 1.0 - x), 4),
        round(min(h / height, 1.0 - y), 4),
    )


def words_from_rows(rows: list[dict], width: int, height: int) -> list[Word]:
    """Convierte filas TSV de Tesseract (nivel palabra) a `Word` con cajas relativas."""
    rows = [r for r in rows if r["text"].strip()]
    line_keys = sorted({(int(r["block_num"]), int(r["par_num"]), int(r["line_num"])) for r in rows})
    par_keys = sorted({(int(r["block_num"]), int(r["par_num"])) for r in rows})
    line_id = {k: i for i, k in enumerate(line_keys)}
    par_id = {k: i for i, k in enumerate(par_keys)}
    words = [
        Word(
            text=r["text"].strip(),
            box=_rel(
                float(r["left"]),
                float(r["top"]),
                float(r["width"]),
                float(r["height"]),
                width,
                height,
            ),
            conf=float(r["conf"]),
            line=line_id[(int(r["block_num"]), int(r["par_num"]), int(r["line_num"]))],
            par=par_id[(int(r["block_num"]), int(r["par_num"]))],
        )
        for r in rows
    ]
    return sorted(words, key=lambda w: (w.line, w.box[0]))


def build_tokens(words: list[Word], known: Callable[[str], bool]) -> list[RawToken]:
    """Une las palabras partidas con guion al final de línea (RF-39) y conserva ambas cajas."""
    by_line: dict[int, list[Word]] = {}
    for w in words:
        by_line.setdefault(w.line, []).append(w)
    lines = [by_line[k] for k in sorted(by_line)]

    class _Known(set):
        def __contains__(self, item: object) -> bool:
            return known(str(item))

    joined = join_hyphenated([[w.text for w in ln] for ln in lines], known=_Known())
    tokens = []
    for tok in joined:
        parts = [lines[li][wi] for li, wi in tok.parts]
        tokens.append(
            RawToken(
                text=tok.text,
                box=parts[0].box,
                box2=parts[1].box if len(parts) > 1 else None,
                conf=min(p.conf for p in parts),
                line=parts[0].line,
                par=parts[0].par,
            )
        )
    return tokens
