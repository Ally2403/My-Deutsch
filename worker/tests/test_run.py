import io
import json
import logging
from pathlib import Path
from typing import ClassVar

import numpy as np
import pymupdf
import pytest
from PIL import Image

from lexicon.build import build_lexicon
from lexicon.store import Lexicon
from pipeline.run import Engine, process_pdf

BARS = "Haus"  # texto que devuelve el OCR simulado: no debe aparecer en los registros


class FakeTranslator:
    def translate(self, text: str) -> str:
        return f"es:{text}"


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


class FakeNlp:
    """Análisis mínimo: cada palabra es un sustantivo cuyo lema es ella misma."""

    vocab = None
    pipeline: ClassVar[list] = []


def fake_analyze(tokens, nlp, lex):
    from pipeline.analyze import Analyzed

    return [Analyzed(t.text, "noun", None, None) for t in tokens]


class CountingEngine(Engine):
    def __init__(self, fail_on_call: int | None = None):
        self.calls = 0
        self.printed_calls = 0
        self.fail_on_call = fail_on_call

    def rows(self, png: bytes) -> list[dict]:
        self.calls += 1
        if self.calls == self.fail_on_call:
            raise RuntimeError("Tesseract murió")
        gray = np.asarray(Image.open(io.BytesIO(png)).convert("L"))
        if gray.mean() > 250:  # hoja en blanco
            return []
        return [
            {
                "text": BARS,
                "left": "100",
                "top": "100",
                "width": "80",
                "height": "20",
                "conf": "91",
                "block_num": "1",
                "par_num": "1",
                "line_num": "1",
            }
        ]

    def rotation(self, png: bytes) -> int:
        return 0

    def printed(self, gray: np.ndarray) -> list[int]:
        self.printed_calls += 1
        return [4 + self.printed_calls]


def run(pdf, out, lex, engine, monkeypatch, log=None):
    monkeypatch.setattr("pipeline.run.analyze", fake_analyze)
    return process_pdf(
        pdf,
        out,
        lex=lex,
        nlp=FakeNlp(),
        translator=FakeTranslator(),
        engine=engine,
        dpi=72,
        log=log or logging.getLogger("pipeline.test"),
    )


def test_processes_sheets_into_logical_pages_with_valid_json(pdf, lex, tmp_path, monkeypatch):
    summary = run(pdf, tmp_path, lex, CountingEngine(), monkeypatch)
    assert summary["pages"] == 4
    for n in range(1, 5):
        data = json.loads((tmp_path / "pages" / f"{n}.json").read_text(encoding="utf-8"))
        assert data["v"] == 1 and data["size"][0] == 1600
        assert (tmp_path / "pages" / f"{n}.webp").read_bytes()[:4] == b"RIFF"
    blank = json.loads((tmp_path / "pages" / "4.json").read_text(encoding="utf-8"))
    assert blank["tokens"] == []
    first = json.loads((tmp_path / "pages" / "1.json").read_text(encoding="utf-8"))
    assert first["tokens"][0]["t"] == BARS and "l" in first["tokens"][0]


def test_manifest_has_sizes_confidence_and_inferred_printed_numbers(
    pdf, lex, tmp_path, monkeypatch
):
    run(pdf, tmp_path, lex, CountingEngine(), monkeypatch)
    manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    assert [p["number"] for p in manifest["pages"]] == [1, 2, 3, 4]
    assert [p["printed_number"] for p in manifest["pages"]] == [5, 6, 7, 8]
    assert manifest["pages"][0]["width"] == 1600
    assert manifest["pages"][0]["ocr_confidence"] == 91.0
    assert manifest["pages"][3]["ocr_confidence"] is None
    assert json.loads((tmp_path / "progress.json").read_text(encoding="utf-8"))["status"] == "done"


def test_a_failure_in_page_n_resumes_from_n_without_redoing_earlier_pages(
    pdf, lex, tmp_path, monkeypatch
):
    with pytest.raises(RuntimeError):
        run(pdf, tmp_path, lex, CountingEngine(fail_on_call=3), monkeypatch)
    assert (tmp_path / "pages" / "2.json").exists() and not (tmp_path / "pages" / "3.json").exists()
    assert json.loads((tmp_path / "progress.json").read_text(encoding="utf-8"))["status"] == "error"

    engine = CountingEngine()
    summary = run(pdf, tmp_path, lex, engine, monkeypatch)
    assert engine.calls == 2  # solo las páginas 3 y 4
    assert summary["pages"] == 4
    manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    assert [p["number"] for p in manifest["pages"]] == [1, 2, 3, 4]


def test_logs_never_contain_the_text_of_the_pages(pdf, lex, tmp_path, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    run(pdf, tmp_path, lex, CountingEngine(), monkeypatch, log=logging.getLogger("pipeline"))
    assert caplog.records, "el procesamiento debe registrar su avance"
    assert all(BARS not in r.getMessage() for r in caplog.records)


def test_lexicon_ids_are_exported_for_publishing(pdf, lex, tmp_path, monkeypatch):
    run(pdf, tmp_path, lex, CountingEngine(), monkeypatch)
    data = json.loads((tmp_path / "lexicon.json").read_text(encoding="utf-8"))
    assert data["ids"] == {"Haus|noun": 1}


def test_a_page_with_absurd_dimensions_is_rejected_before_rendering(lex, tmp_path, monkeypatch):
    doc = pymupdf.open()
    doc.new_page(width=14000, height=14000)  # ~196 Mpx a 72 dpi
    path = tmp_path / "enorme.pdf"
    doc.save(path)
    engine = CountingEngine()
    with pytest.raises(ValueError, match="demasiado grande"):
        run(path, tmp_path / "out", lex, engine, monkeypatch)
    assert engine.calls == 0


def test_the_whole_book_has_a_time_budget(pdf, lex, tmp_path, monkeypatch):
    monkeypatch.setattr("pipeline.run.analyze", fake_analyze)
    engine = CountingEngine()
    with pytest.raises(TimeoutError, match="tiempo total"):
        process_pdf(
            pdf,
            tmp_path,
            lex=lex,
            nlp=FakeNlp(),
            translator=FakeTranslator(),
            engine=engine,
            dpi=72,
            budget_s=-1,
        )
    assert engine.calls == 0
