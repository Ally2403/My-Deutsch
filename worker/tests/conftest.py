import io
import json
from pathlib import Path

import numpy as np
import pymupdf
import pytest
from PIL import Image

from lexicon.build import build_lexicon
from lexicon.store import Lexicon


def _png(gray: np.ndarray) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(gray).save(buf, "PNG")
    return buf.getvalue()


def _sheet(w: int, h: int, blocks: list[tuple[int, int]]) -> np.ndarray:
    img = np.full((h, w), 255, np.uint8)
    for x0, x1 in blocks:
        for y in range(int(h * 0.15), int(h * 0.85), 30):
            img[y : y + 12, x0:x1] = 0
    return img


@pytest.fixture(scope="module")
def pdf(tmp_path_factory) -> Path:
    """3 hojas: una página, una doble página con lomo y una hoja en blanco → 4 páginas lógicas."""
    sheets = [
        _sheet(600, 800, [(100, 500)]),
        _sheet(1200, 800, [(100, 480), (720, 1100)]),
        np.full((800, 600), 255, np.uint8),
    ]
    doc = pymupdf.open()
    for g in sheets:
        h, w = g.shape
        page = doc.new_page(width=w, height=h)
        page.insert_image(page.rect, stream=_png(g))
    path = tmp_path_factory.mktemp("pdf") / "libro.pdf"
    doc.save(path)
    return path


@pytest.fixture(scope="module")
def lex(tmp_path_factory) -> Lexicon:
    d = tmp_path_factory.mktemp("lexrun")
    entry = {"word": "Haus", "pos": "noun", "senses": [{"glosses": ["house"], "tags": ["neuter"]}]}
    (d / "mini.jsonl").write_text(json.dumps(entry), encoding="utf-8")
    build_lexicon(d / "mini.jsonl", d / "lexicon.sqlite")
    return Lexicon(d / "lexicon.sqlite")
