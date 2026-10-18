"""Tesseract `deu` (ADR-005): sin preprocesamiento, 300 DPI en escala de grises."""

import csv
import io
import re
import subprocess

import numpy as np
import pymupdf

from pipeline.pages import downscale, footer_band

OCR_TIMEOUT_S = 180  # un PDF subido por un usuario no debe poder colgar el worker


def tesseract(png: bytes, *args: str) -> str:
    cmd = ["tesseract", "stdin", "stdout", *args]
    try:
        return subprocess.run(
            cmd, input=png, capture_output=True, check=True, timeout=OCR_TIMEOUT_S
        ).stdout.decode()
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError(f"Tesseract excedió {OCR_TIMEOUT_S} s en una página") from exc


def osd_rotation(png: bytes) -> int:
    try:
        out = tesseract(png, "--psm", "0")
    except (subprocess.CalledProcessError, TimeoutError):
        return 0  # sin orientación fiable se asume derecha; el OCR de la página sigue
    m = re.search(r"Rotate: (\d+)", out)
    return int(m.group(1)) if m else 0


def to_png(gray: np.ndarray) -> bytes:
    h, w = gray.shape
    return pymupdf.Pixmap(pymupdf.csGRAY, w, h, gray.tobytes(), False).tobytes("png")


def ocr_words(png: bytes, psm: str = "3") -> list[dict]:
    tsv = tesseract(png, "-l", "deu", "--oem", "1", "--psm", psm, "tsv")
    rows = csv.DictReader(io.StringIO(tsv), delimiter="\t", quoting=csv.QUOTE_NONE)
    return [r for r in rows if r["level"] == "5" and r["text"].strip()]


def printed_candidates(page: np.ndarray) -> list[int]:
    """Lecturas del número del pie con varias escalas y umbrales (la trama gris confunde)."""
    digits = "tessedit_char_whitelist=0123456789"
    found: list[int] = []
    for k in (2, 3):
        for threshold in (90, 110, 130):
            band = footer_band(downscale(page, k), threshold)
            text = tesseract(to_png(band), "--psm", "11", "-c", digits)
            found += [int(t) for t in text.split() if t.isdigit() and len(t) <= 4]
    return found
