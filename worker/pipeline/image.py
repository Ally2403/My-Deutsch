"""Imagen WebP de cada página: 1 600 px de ancho y ≤ 250 KB (CLAUDE.md, plan gratuito)."""

import io

import numpy as np
from PIL import Image

WIDTH = 1600
MAX_BYTES = 250 * 1024
QUALITIES = (80, 70, 60, 50, 40)


def webp_size(shape: tuple[int, ...], width: int = WIDTH) -> tuple[int, int]:
    h, w = shape[:2]
    return width, round(h * width / w)


def render_webp(gray: np.ndarray, width: int = WIDTH, max_bytes: int = MAX_BYTES) -> bytes:
    """Reduce a `width` px y baja la calidad hasta cumplir `max_bytes`; nunca devuelve más."""
    img = Image.fromarray(gray).resize(webp_size(gray.shape, width), Image.Resampling.LANCZOS)
    size = 0
    for quality in QUALITIES:
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=quality, method=6)
        size = buf.tell()
        if size <= max_bytes:
            return buf.getvalue()
    raise ValueError(f"WebP de {size} bytes excede el límite de {max_bytes} bytes")
