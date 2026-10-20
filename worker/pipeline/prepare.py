"""Etapa A del procesamiento (RNF-18): todo lo que solo usa Tesseract, numpy y PIL.

Una hoja del PDF se prepara de forma independiente de las demás (se puede ejecutar en un hilo):
render, orientación, separación de dobles, OCR, número impreso, campos, ilustraciones y WebP.
La etapa B (análisis, traducción, numeración y publicación) corre después, en orden.

ADR-002: nada de lo que se registra aquí lleva texto del libro.
"""

import time
from dataclasses import dataclass, field

import numpy as np
import pymupdf

from pipeline.fields import detect_fields, detect_lines, merge_fields
from pipeline.geometry import Box, Word, words_from_rows
from pipeline.image import MAX_INPUT_PIXELS, render_webp, webp_size
from pipeline.images import detect_images
from pipeline.noise import drop_noise
from pipeline.ocr import to_png
from pipeline.pages import split_spread


@dataclass
class PreparedPage:
    part: int  # posición dentro de la hoja (0 = izquierda)
    parts: int  # páginas lógicas de la hoja (1 o 2)
    skip: bool = False  # ya estaba terminada en disco (reanudación): no hay datos que publicar
    words: list[Word] = field(default_factory=list)  # tras quitar el ruido
    fields: list[Box] = field(default_factory=list)
    images: list[Box] = field(default_factory=list)
    size: tuple[int, int] = (0, 0)
    ocr_confidence: float | None = None
    candidates: list[int] = field(default_factory=list)
    webp: bytes = b""
    seconds: dict[str, float] = field(default_factory=dict)
    error: BaseException | None = None  # se relanza en orden, al llegar a esta página


@dataclass
class PreparedSheet:
    index: int
    pages: list[PreparedPage]
    error: BaseException | None = None  # fallo de la hoja entera (tamaño, render)


def render_sheet(sheet: pymupdf.Page, dpi: int, index: int) -> np.ndarray:
    pixels = sheet.rect.width * dpi / 72 * sheet.rect.height * dpi / 72
    if pixels > MAX_INPUT_PIXELS:
        raise ValueError(f"La hoja {index} es demasiado grande ({pixels / 1e6:.0f} Mpx)")
    pm = sheet.get_pixmap(dpi=dpi, colorspace=pymupdf.csGRAY)
    return np.frombuffer(pm.samples, np.uint8).reshape(pm.h, pm.w)


def _prepare_page(page: np.ndarray, part: int, parts: int, engine, times) -> PreparedPage:
    seconds: dict[str, float] = {}

    def timed(stage: str, fn, *args):
        t0 = time.monotonic()
        try:
            return fn(*args)
        finally:
            elapsed = time.monotonic() - t0
            seconds[stage] = seconds.get(stage, 0.0) + elapsed
            times.add(stage, elapsed)

    height, width = page.shape
    rows = timed("ocr", lambda: engine.rows(to_png(page)))
    raw_words = words_from_rows(rows, width, height)
    # RF-34: antes de drop_noise, que descarta las líneas «____», y además las rayas de la imagen
    fields = merge_fields(detect_fields(raw_words), detect_lines(page))
    images = detect_images(page, [w.box for w in raw_words])  # RF-18
    words = drop_noise(raw_words)
    size = webp_size(page.shape)
    confs = [w.conf for w in words if w.conf >= 0]
    return PreparedPage(
        part=part,
        parts=parts,
        words=words,
        fields=fields,
        images=images,
        size=size,
        ocr_confidence=round(sum(confs) / len(confs), 1) if confs else None,
        candidates=timed("printed", engine.printed, page),
        webp=timed("webp", render_webp, page),
        seconds=seconds,
    )


def prepare_sheet(
    pdf,
    index: int,
    dpi: int,
    engine,
    times,
    resume: tuple[int, frozenset[int]] | None = None,
) -> PreparedSheet:
    """Prepara la hoja `index` (1-based). Abre su propio documento: PyMuPDF no es seguro entre
    hilos. Nunca lanza: los fallos viajan en `error` y se relanzan en orden en la etapa B.

    `resume` = (páginas de la hoja, posiciones ya terminadas en disco). Si están todas, no se
    renderiza ni se hace OCR; si faltan algunas, solo se prepara lo que falta."""
    try:
        if resume is not None and len(resume[1]) >= resume[0]:
            return PreparedSheet(
                index, [PreparedPage(j, resume[0], skip=True) for j in range(resume[0])]
            )
        t0 = time.monotonic()
        with pymupdf.open(pdf) as doc:
            gray = render_sheet(doc[index - 1], dpi, index)
        rotation = engine.rotation(to_png(gray))
        if rotation:
            gray = np.ascontiguousarray(np.rot90(gray, k=-rotation // 90))
        spans = split_spread(gray)
        times.add("rot", time.monotonic() - t0)
        done = resume[1] if resume else frozenset()
        pages: list[PreparedPage] = []
        for j, (x0, x1) in enumerate(spans):
            if j in done:
                pages.append(PreparedPage(j, len(spans), skip=True))
                continue
            try:
                page = np.ascontiguousarray(gray[:, x0:x1])
                pages.append(_prepare_page(page, j, len(spans), engine, times))
            except Exception as exc:  # noqa: BLE001 - se relanza en orden desde la etapa B
                pages.append(PreparedPage(j, len(spans), error=exc))
                break
        return PreparedSheet(index, pages)
    except Exception as exc:  # noqa: BLE001
        return PreparedSheet(index, [], error=exc)
