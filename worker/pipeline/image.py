"""Imagen WebP de cada página: 1 600 px de ancho y ≤ 250 KB (CLAUDE.md, plan gratuito)."""

import io

import numpy as np
from PIL import Image

WIDTH = 1600
MAX_BYTES = 250 * 1024
QUALITIES = (80, 70, 60, 50, 40)
# RF-46: una página muy cargada (foto) no baja de 250 KB a 1 600 px; se reduce el ancho antes de
# rendirse. Las cajas del JSON son proporciones, así que otro ancho no las desplaza.
FALLBACK_WIDTHS = (1400, 1200, 1000, 800)
MAX_INPUT_PIXELS = 80_000_000  # una página absurda no debe agotar la memoria del runner
MAX_ASPECT = 3.0  # alto/ancho máximo; una página de libro es ≈ 1,4


def webp_size(shape: tuple[int, ...], width: int = WIDTH) -> tuple[int, int]:
    h, w = shape[:2]
    if h <= 0 or w <= 0:
        raise ValueError("La página tiene dimensiones inválidas")
    if h / w > MAX_ASPECT:
        raise ValueError(f"La página tiene una proporción absurda ({h}×{w})")
    return width, max(1, round(h * width / w))


def render_webp(gray: np.ndarray, width: int = WIDTH, max_bytes: int = MAX_BYTES) -> bytes:
    """Reduce a `width` px y baja la calidad hasta cumplir `max_bytes`; nunca devuelve más."""
    if gray.shape[0] * gray.shape[1] > MAX_INPUT_PIXELS:
        raise ValueError("La página es demasiado grande para procesarla")
    written = 0
    for w in (width, *(f for f in FALLBACK_WIDTHS if f < width)):
        img = Image.fromarray(gray).resize(webp_size(gray.shape, w), Image.Resampling.LANCZOS)
        for quality in QUALITIES:
            buf = io.BytesIO()
            img.save(buf, "WEBP", quality=quality, method=6)
            written = buf.tell()
            if written <= max_bytes:
                return buf.getvalue()
    raise ValueError(f"WebP de {written} bytes excede el límite de {max_bytes} bytes")
