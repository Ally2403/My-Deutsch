"""Tesseract `deu` (ADR-005): sin preprocesamiento, 300 DPI en escala de grises."""

import csv
import io
import re
import subprocess

import numpy as np
import pymupdf


def tesseract(png: bytes, *args: str) -> str:
    cmd = ["tesseract", "stdin", "stdout", *args]
    return subprocess.run(cmd, input=png, capture_output=True, check=True).stdout.decode()


def osd_rotation(png: bytes) -> int:
    try:
        out = tesseract(png, "--psm", "0")
    except subprocess.CalledProcessError:
        return 0
    m = re.search(r"Rotate: (\d+)", out)
    return int(m.group(1)) if m else 0


def to_png(gray: np.ndarray) -> bytes:
    h, w = gray.shape
    return pymupdf.Pixmap(pymupdf.csGRAY, w, h, gray.tobytes(), False).tobytes("png")


def ocr_words(png: bytes, psm: str = "3") -> list[dict]:
    tsv = tesseract(png, "-l", "deu", "--oem", "1", "--psm", psm, "tsv")
    rows = csv.DictReader(io.StringIO(tsv), delimiter="\t", quoting=csv.QUOTE_NONE)
    return [r for r in rows if r["level"] == "5" and r["text"].strip()]
