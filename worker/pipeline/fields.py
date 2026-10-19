"""RF-34: huecos para completar («____») detectados antes de que `drop_noise` los descarte."""

import re

import numpy as np

from pipeline.geometry import Box, Word

MIN_HEIGHT = 0.02  # alto mínimo del campo: espacio para escribir encima de la línea
MERGE_GAP = 0.02  # huecos de la misma línea más cerca que esto forman un solo campo
_RUN = re.compile(r"_{3,}")
_DASHES = set("—–−‗-")


def _is_blank(text: str) -> bool:
    if "_" in text and set(text) <= _DASHES | {"_"}:
        return True
    return len(text) >= 4 and set(text) <= _DASHES  # un guion suelto o dos no son un hueco


def _field_box(x: float, y: float, w: float, h: float) -> Box:
    """La caja de una línea es finísima: se sube para que el campo quede sobre ella."""
    fh = min(max(h, MIN_HEIGHT), 1.0)
    bottom = min(y + h, 1.0)
    top = max(bottom - fh, 0.0)
    return (round(x, 4), round(top, 4), round(min(w, 1.0 - x), 4), round(min(fh, 1.0 - top), 4))


def detect_fields(words: list[Word]) -> list[Box]:
    pieces: list[tuple[int, Box]] = []  # (línea, caja)
    for wd in words:
        x, y, w, h = wd.box
        if _is_blank(wd.text):
            pieces.append((wd.line, _field_box(x, y, w, h)))
            continue
        run = _RUN.search(wd.text)
        if run and len(wd.text) > 0:
            n = len(wd.text)
            start = x + w * run.start() / n
            pieces.append((wd.line, _field_box(start, y, x + w - start, h)))
    pieces.sort(key=lambda p: (p[0], p[1][0]))
    merged: list[tuple[int, Box]] = []
    for line, box in pieces:
        if merged and merged[-1][0] == line:
            px, py, pw, ph = merged[-1][1]
            if box[0] - (px + pw) <= MERGE_GAP:
                right = max(px + pw, box[0] + box[2])
                top = min(py, box[1])
                bottom = max(py + ph, box[1] + box[3])
                merged[-1] = (line, (px, top, round(right - px, 4), round(bottom - top, 4)))
                continue
        merged.append((line, box))
    return sorted((b for _, b in merged), key=lambda b: (round(b[1], 2), b[0]))


# --- líneas de respuesta en la imagen -------------------------------------------------------
# Tesseract casi nunca lee una línea de subrayado como texto (medido en 2 hojas de ejercicios:
# 6 de 21 huecos), así que además se buscan rayas horizontales finas en los píxeles de la página.
DARK = 160  # un píxel más oscuro que esto es tinta
MIN_LEN = 0.04  # ancho mínimo de la raya, relativo al ancho de la página
MAX_THICK = 0.008  # grosor máximo (con la inclinación del escáner), relativo al alto
MIN_RATIO = 12  # largo / grosor mínimo: una raya, no un bloque
EDGE = 0.01  # una raya que toca el borde de la hoja es sombra del escáner, no un hueco
HEADER = 0.07  # franjas de encabezado y pie: adornos y números de página, no ejercicios
FOOTER = 0.96
RUN_GAP = 3  # píxeles de hueco que se perdonan dentro de una raya (ruido del escáner)


def _runs(dark_row: np.ndarray, min_len: int) -> list[tuple[int, int]]:
    """Tramos [x0, x1] de tinta continua en una fila, uniendo huecos de hasta `RUN_GAP` px."""
    idx = np.flatnonzero(dark_row)
    if idx.size < min_len:
        return []
    cuts = np.flatnonzero(np.diff(idx) > RUN_GAP + 1)
    starts = np.concatenate(([0], cuts + 1))
    ends = np.concatenate((cuts, [idx.size - 1]))
    return [
        (int(idx[s]), int(idx[e]))
        for s, e in zip(starts, ends, strict=True)
        if idx[e] - idx[s] + 1 >= min_len
    ]


def detect_lines(gray: np.ndarray) -> list[Box]:
    height, width = gray.shape
    min_len = max(int(width * MIN_LEN), 8)
    max_thick = max(int(height * MAX_THICK), 4)
    dark = gray < DARK
    comps: list[list[int]] = []  # [x0, x1, y0, y1]
    for y in range(height):
        for x0, x1 in _runs(dark[y], min_len):
            for c in comps:
                if y - c[3] <= 1 and x0 <= c[1] + RUN_GAP and x1 >= c[0] - RUN_GAP:
                    c[0], c[1], c[3] = min(c[0], x0), max(c[1], x1), y
                    break
            else:
                comps.append([x0, x1, y, y])
    out: list[Box] = []
    for x0, x1, y0, y1 in comps:
        length, thick = x1 - x0 + 1, y1 - y0 + 1
        if not (length >= min_len and thick <= max_thick and length / thick >= MIN_RATIO):
            continue
        if x0 / width < EDGE or x1 / width > 1 - EDGE:
            continue
        if y1 / height < HEADER or y0 / height > FOOTER:
            continue
        out.append(_field_box(x0 / width, y0 / height, length / width, thick / height))
    return sorted(out, key=lambda b: (round(b[1], 2), b[0]))


def _overlap(a: Box, b: Box) -> float:
    """Fracción del campo más pequeño cubierta por el otro."""
    w = min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0])
    h = min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1])
    if w <= 0 or h <= 0:
        return 0.0
    return w * h / min(a[2] * a[3], b[2] * b[3])


def merge_fields(ocr: list[Box], lines: list[Box]) -> list[Box]:
    """Une los campos del OCR y de las rayas, sin duplicar los que ya cubre el OCR."""
    extra = [b for b in lines if all(_overlap(b, o) < 0.5 for o in ocr)]
    return sorted([*ocr, *extra], key=lambda b: (round(b[1], 2), b[0]))
