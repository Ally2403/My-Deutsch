"""RF-18: ilustraciones de la página (zonas con textura que el OCR no cubre)."""

import numpy as np

from pipeline.geometry import Box

CELLS_ACROSS = 64  # la página se divide en ≈ 64 columnas de celdas cuadradas
BUSY_STD = 22.0  # desviación de grises mínima de una celda con textura (fotos, trazos)
PAPER_DIFF = 40.0  # o relleno plano muy distinto del papel (dibujos vectoriales)
MIN_W = 0.15  # tamaño mínimo de una ilustración, relativo a la página
MIN_H = 0.08
MIN_FILL = 0.4  # fracción de celdas «con dibujo» dentro de su caja
HEADER = 0.15  # encabezado y pie: adornos de la maqueta, no ilustraciones
FOOTER = 0.96
BLEED = 0.02  # una zona pegada al borde superior o inferior es una banda de la maqueta
WORD_PAD = 0.006  # margen alrededor de cada palabra del OCR


def _busy_cells(gray: np.ndarray, size: int, words: list[Box]) -> np.ndarray:
    h, w = gray.shape
    rows, cols = h // size, w // size
    blocks = gray[: rows * size, : cols * size].reshape(rows, size, cols, size).astype(np.float32)
    paper = float(np.median(gray))
    busy = (blocks.std(axis=(1, 3)) >= BUSY_STD) | (
        np.abs(blocks.mean(axis=(1, 3)) - paper) >= PAPER_DIFF
    )
    for (
        x,
        y,
        bw,
        bh,
    ) in words:  # el texto también «tiene dibujo»: se descarta lo que cubren las palabras
        c0 = max(int((x - WORD_PAD) * w / size), 0)
        c1 = min(int(np.ceil((x + bw + WORD_PAD) * w / size)), cols)
        r0 = max(int((y - WORD_PAD) * h / size), 0)
        r1 = min(int(np.ceil((y + bh + WORD_PAD) * h / size)), rows)
        busy[r0:r1, c0:c1] = False
    return busy


def _components(mask: np.ndarray) -> list[list[tuple[int, int]]]:
    """Componentes conexos (8 vecinos) de celdas verdaderas, tras unir huecos de una celda."""
    rows, cols = mask.shape
    grown = mask.copy()
    grown[1:, :] |= mask[:-1, :]
    grown[:-1, :] |= mask[1:, :]
    grown[:, 1:] |= mask[:, :-1]
    grown[:, :-1] |= mask[:, 1:]
    seen = np.zeros_like(mask)
    out: list[list[tuple[int, int]]] = []
    for r in range(rows):
        for c in range(cols):
            if not grown[r, c] or seen[r, c]:
                continue
            stack, cells = [(r, c)], []
            seen[r, c] = True
            while stack:
                y, x = stack.pop()
                if mask[y, x]:
                    cells.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < rows and 0 <= nx < cols and grown[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
            out.append(cells)
    return out


def detect_images(gray: np.ndarray, words: list[Box]) -> list[Box]:
    h, w = gray.shape
    size = max(w // CELLS_ACROSS, 8)
    busy = _busy_cells(gray, size, words)
    boxes: list[Box] = []
    for cells in _components(busy):
        ys = [y for y, _ in cells]
        xs = [x for _, x in cells]
        y0, y1, x0, x1 = min(ys), max(ys) + 1, min(xs), max(xs) + 1
        bw, bh = (x1 - x0) * size / w, (y1 - y0) * size / h
        if bw < MIN_W or bh < MIN_H:
            continue
        if len(cells) / ((x1 - x0) * (y1 - y0)) < MIN_FILL:
            continue
        top, bottom = y0 * size / h, y1 * size / h
        if bottom < HEADER or top > FOOTER or top < BLEED or bottom > 1 - BLEED:
            continue
        boxes.append(
            (
                round(x0 * size / w, 4),
                round(top, 4),
                round(min(bw, 1.0), 4),
                round(min(bh, 1.0 - top), 4),
            )
        )
    return sorted(boxes, key=lambda b: (round(b[1], 2), b[0]))
