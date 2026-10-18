"""Enderezado y separación de dobles páginas (RF-38)."""

import numpy as np

INK = 128  # gris por debajo del cual un píxel cuenta como tinta
CLEAR = 0.002  # fracción máxima de tinta en una columna "en blanco"


def find_spine(gray: np.ndarray) -> int | None:
    """Columna del lomo de una doble página, o None si la imagen es una sola página.

    Busca, en la franja central (35–65 % del ancho), la racha más ancha de columnas
    sin tinta y exige que haya texto a ambos lados.
    """
    h, w = gray.shape
    if w < h:  # una doble página escaneada es apaisada
        return None
    rows = gray[int(h * 0.1) : int(h * 0.9)]
    ink = (rows < INK).mean(axis=0)
    lo, hi = int(w * 0.35), int(w * 0.65)

    best_start, best_len, start = 0, 0, None
    for x in range(lo, hi + 1):
        clear = x < hi and ink[x] < CLEAR
        if clear and start is None:
            start = x
        elif not clear and start is not None:
            if x - start > best_len:
                best_start, best_len = start, x - start
            start = None

    if best_len < w * 0.005:
        return None
    spine = best_start + best_len // 2
    if ink[:spine].mean() < 0.01 or ink[spine:].mean() < 0.01:
        return None
    return spine


def split_spread(gray: np.ndarray) -> list[tuple[int, int]]:
    """Rangos de columnas [x0, x1) de cada página lógica, de izquierda a derecha."""
    spine = find_spine(gray)
    w = gray.shape[1]
    return [(0, w)] if spine is None else [(0, spine), (spine, w)]


def infer_printed_numbers(candidates: list[list[int]]) -> list[int | None]:
    """Números impresos de cada página a partir de candidatos ruidosos del pie.

    Cada candidato vota por un desfase (número − índice); gana el más votado si al
    menos dos páginas distintas lo respaldan. Sin consenso, no se asigna número.
    """
    votes: dict[int, set[int]] = {}
    for i, cands in enumerate(candidates):
        for c in cands:
            votes.setdefault(c - i, set()).add(i)
    best = max(votes, key=lambda o: len(votes[o]), default=None)
    if best is None or len(votes[best]) < 2:
        return [None] * len(candidates)
    return [i + best for i in range(len(candidates))]


def downscale(gray: np.ndarray, k: int) -> np.ndarray:
    h, w = gray.shape
    blocks = gray[: h // k * k, : w // k * k].reshape(h // k, k, w // k, k)
    return blocks.mean(axis=(1, 3)).astype(np.uint8)


def footer_band(gray: np.ndarray, threshold: int = 110) -> np.ndarray:
    """Franja del pie sin la banda negra inferior, binarizada para leer el número."""
    h = gray.shape[0]
    foot = gray[int(h * 0.90) :]
    dark_rows = (foot < 60).mean(axis=1) > 0.5
    if dark_rows.any():
        foot = foot[: int(np.argmax(dark_rows))]
    return np.where(foot < threshold, 0, 255).astype(np.uint8)
