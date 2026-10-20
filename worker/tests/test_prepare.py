"""RNF-18: etapa A en hilos y etapa B en orden. La salida con varios hilos es idéntica a la
secuencial, el orden de publicación no depende del orden en que terminan las hojas, la
reanudación no repite OCR y un fallo en un hilo detiene el libro en vez de dejarlo colgado."""

import io
import json
import threading
import time

import numpy as np
import pytest
from PIL import Image
from test_run import CountingEngine, run

from pipeline.run import Engine


def _gray(png: bytes) -> np.ndarray:
    return np.asarray(Image.open(io.BytesIO(png)).convert("L"))


class ContentEngine(CountingEngine):
    """Salida que depende solo del contenido de la página (no del orden de las llamadas)."""

    def __init__(self, delays: dict[int, float] | None = None, **kw):
        super().__init__(**kw)
        self.delays = delays or {}
        self.lock = threading.Lock()
        self.rotation_calls = 0
        self.rows_widths: list[int] = []

    def rows(self, png: bytes) -> list[dict]:
        gray = _gray(png)
        with self.lock:
            self.calls += 1
            self.rows_widths.append(gray.shape[1])
        time.sleep(self.delays.get(gray.shape[1], 0.0))
        if gray.mean() > 250:
            return []
        return [
            {
                "text": "Haus",
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
        with self.lock:
            self.rotation_calls += 1
        return 0

    def printed(self, gray: np.ndarray) -> list[int]:
        return [4 + int(gray.mean()) % 7]


def read_output(out):
    files = sorted((out / "pages").glob("*.json")) + sorted((out / "pages").glob("*.webp"))
    files += [out / "manifest.json", out / "lexicon.json"]
    return {f.relative_to(out).as_posix(): f.read_bytes() for f in files}


def test_output_is_byte_identical_with_one_or_three_workers(pdf, lex, tmp_path, monkeypatch):
    run(pdf, tmp_path / "seq", lex, ContentEngine(), monkeypatch, workers=1)
    run(pdf, tmp_path / "par", lex, ContentEngine(), monkeypatch, workers=3)
    seq, par = read_output(tmp_path / "seq"), read_output(tmp_path / "par")
    assert seq.keys() == par.keys() and len(seq) >= 10
    assert all(seq[k] == par[k] for k in seq)


def test_pages_are_published_in_order_even_if_sheets_finish_out_of_order(
    pdf, lex, tmp_path, monkeypatch
):
    # la hoja 1 (600 px de ancho) tarda mucho más que las demás
    engine = ContentEngine(delays={600: 0.4})
    pages, sheets = [], []
    run(
        pdf,
        tmp_path,
        lex,
        engine,
        monkeypatch,
        workers=3,
        on_page=lambda n, d: pages.append(n),
        on_sheet=sheets.append,
    )
    assert pages == [1, 2, 3, 4] and sheets == [1, 2, 3]


def test_resume_does_no_ocr_for_pages_already_done(pdf, lex, tmp_path, monkeypatch):
    run(pdf, tmp_path / "full", lex, ContentEngine(), monkeypatch, workers=1)
    # corte tras la página 3: se pierde la 4 (hoja 3)
    run(pdf, tmp_path / "cut", lex, ContentEngine(), monkeypatch, workers=1)
    for ext in ("json", "webp", "meta.json"):
        (tmp_path / "cut" / "pages" / f"4.{ext}").unlink()
    (tmp_path / "cut" / "manifest.json").unlink()

    engine = ContentEngine()
    seen = []
    summary = run(
        pdf,
        tmp_path / "cut",
        lex,
        engine,
        monkeypatch,
        workers=3,
        on_page=lambda n, d: seen.append(n),
    )
    assert engine.calls == 1  # solo el OCR de la página 4
    assert engine.rotation_calls == 1  # solo se orienta la hoja 3
    assert summary["pages"] == 4 and summary["skipped"] == 3 and seen == [1, 2, 3, 4]
    assert read_output(tmp_path / "cut") == read_output(tmp_path / "full")


def test_resume_of_a_half_done_double_sheet_redoes_only_the_missing_page(
    pdf, lex, tmp_path, monkeypatch
):
    run(pdf, tmp_path / "full", lex, ContentEngine(), monkeypatch, workers=1)
    run(pdf, tmp_path / "cut", lex, ContentEngine(), monkeypatch, workers=1)
    for n in (3, 4):
        for ext in ("json", "webp", "meta.json"):
            (tmp_path / "cut" / "pages" / f"{n}.{ext}").unlink()
    engine = ContentEngine()
    run(pdf, tmp_path / "cut", lex, engine, monkeypatch, workers=2)
    assert engine.calls == 2  # páginas 3 y 4; la 2 (misma hoja) no se repite
    assert read_output(tmp_path / "cut") == read_output(tmp_path / "full")


class TimeoutOnSecondSheet(ContentEngine):
    def rotation(self, png: bytes) -> int:
        if _gray(png).shape[1] == 1200:  # la hoja 2 (doble página)
            raise TimeoutError("Tesseract excedió 180 s en una página")
        return super().rotation(png)


@pytest.mark.parametrize("workers", [1, 3])
def test_a_timeout_in_a_sheet_stops_the_book_and_marks_progress_error(
    workers, pdf, lex, tmp_path, monkeypatch
):
    before = threading.active_count()
    pages = []
    with pytest.raises(TimeoutError, match="Tesseract"):
        run(
            pdf,
            tmp_path,
            lex,
            TimeoutOnSecondSheet(),
            monkeypatch,
            workers=workers,
            on_page=lambda n, d: pages.append(n),
        )
    assert pages == [1]  # nada posterior a la hoja que falló se publica
    assert json.loads((tmp_path / "progress.json").read_text(encoding="utf-8"))["status"] == "error"
    assert not (tmp_path / "manifest.json").exists()
    assert threading.active_count() == before  # los hilos terminaron: nada queda colgado


def test_new_lemmas_are_translated_in_one_batch_per_page(pdf, lex, tmp_path, monkeypatch):
    """RNF-18: la traducción va por lote (warm) y el resultado no cambia."""
    import logging

    from test_run import FakeNlp, FakeTranslator, fake_analyze

    from pipeline.run import process_pdf

    class Batching(FakeTranslator):
        def __init__(self):
            self.batches = []

        def warm(self, german, english):
            self.batches.append((list(german), list(english)))

    t = Batching()
    monkeypatch.setattr("pipeline.run.analyze", fake_analyze)
    process_pdf(
        pdf,
        tmp_path,
        lex=lex,
        nlp=FakeNlp(),
        translator=t,
        engine=ContentEngine(),
        dpi=72,
        workers=1,
        log=logging.getLogger("pipeline.test"),
    )
    assert t.batches and t.batches[0][0]  # el primer lote lleva la sonda de «Haus»
    assert all(not de and not en for de, en in t.batches[1:])  # «Haus» ya no es nuevo


def test_default_engine_runs_tesseract_with_one_thread_when_parallel():
    assert Engine(single_thread=True)._env["OMP_THREAD_LIMIT"] == "1"
    assert Engine()._env is None
