import io
import json
import logging
from typing import ClassVar

import numpy as np
import pymupdf
import pytest
from PIL import Image

from pipeline.run import Engine, process_pdf

BARS = "Haus"  # texto que devuelve el OCR simulado: no debe aparecer en los registros


class FakeTranslator:
    def from_german(self, text: str) -> str:
        return f"es:{text}"

    from_english = from_german


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


def run(pdf, out, lex, engine, monkeypatch, log=None, workers=1, **hooks):
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
        workers=workers,
        **hooks,
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


def test_cli_logging_keeps_pipeline_progress_but_silences_third_party_noise():
    from pipeline.run import configure_logging

    configure_logging()
    assert logging.getLogger("pipeline").getEffectiveLevel() == logging.INFO
    assert logging.getLogger("transformers").getEffectiveLevel() >= logging.WARNING
    assert logging.getLogger().getEffectiveLevel() >= logging.WARNING


def test_reset_output_removes_the_processed_book_but_nothing_else(tmp_path):
    from pipeline.run import reset_output

    (tmp_path / "pages").mkdir()
    (tmp_path / "pages" / "1.json").write_text("{}", encoding="utf-8")
    for name in ("manifest.json", "progress.json", "lexicon.json"):
        (tmp_path / name).write_text("{}", encoding="utf-8")
    (tmp_path / "notas.txt").write_text("mío", encoding="utf-8")
    reset_output(tmp_path)
    assert not (tmp_path / "pages").exists()
    assert not any(
        (tmp_path / n).exists() for n in ("manifest.json", "progress.json", "lexicon.json")
    )
    assert (tmp_path / "notas.txt").read_text(encoding="utf-8") == "mío"


def test_reset_output_on_a_missing_folder_is_harmless(tmp_path):
    from pipeline.run import reset_output

    reset_output(tmp_path / "no-existe")


def test_on_start_receives_sheet_count(pdf, lex, tmp_path, monkeypatch):
    sheets = []
    run(pdf, tmp_path, lex, CountingEngine(), monkeypatch, on_start=sheets.append)
    assert sheets == [3]


def test_on_page_called_for_every_logical_page_in_order(pdf, lex, tmp_path, monkeypatch):
    seen = []

    def on_page(n, pages_dir):
        assert (pages_dir / f"{n}.json").exists() and (tmp_path / "lexicon.json").exists()
        seen.append(n)

    run(pdf, tmp_path, lex, CountingEngine(), monkeypatch, on_page=on_page)
    assert seen == [1, 2, 3, 4]


def test_on_page_called_for_skipped_pages_on_resume(pdf, lex, tmp_path, monkeypatch):
    run(pdf, tmp_path, lex, CountingEngine(), monkeypatch)
    seen = []
    engine = CountingEngine()
    run(pdf, tmp_path, lex, engine, monkeypatch, on_page=lambda n, d: seen.append(n))
    assert engine.calls == 0 and seen == [1, 2, 3, 4]


def test_hook_exception_marks_progress_error(pdf, lex, tmp_path, monkeypatch):
    def boom(n, pages_dir):
        raise RuntimeError("publicar falló")

    with pytest.raises(RuntimeError):
        run(pdf, tmp_path, lex, CountingEngine(), monkeypatch, on_page=boom)
    progress = json.loads((tmp_path / "progress.json").read_text(encoding="utf-8"))
    assert progress["status"] == "error"


def test_on_sheet_is_called_once_per_pdf_sheet_after_its_pages(pdf, lex, tmp_path, monkeypatch):
    """RF-46: el avance cuenta hojas del PDF, no páginas lógicas (una doble son 2 páginas)."""
    events: list[tuple[str, int]] = []
    summary = run(
        pdf,
        tmp_path,
        lex,
        CountingEngine(),
        monkeypatch,
        on_page=lambda n, d: events.append(("page", n)),
        on_sheet=lambda i: events.append(("sheet", i)),
    )
    assert summary["sheets"] == 3 and summary["pages"] == 4
    # la hoja 2 (doble) se anuncia después de sus páginas 2 y 3
    assert events == [
        ("page", 1),
        ("sheet", 1),
        ("page", 2),
        ("page", 3),
        ("sheet", 2),
        ("page", 4),
        ("sheet", 3),
    ]


def test_summary_reports_seconds_per_stage_without_leaking_into_the_manifest(
    pdf, lex, tmp_path, monkeypatch
):
    """RNF-18: tiempos por etapa (solo números) en el resumen; el manifiesto es determinista."""
    from pipeline.run import STAGES

    summary = run(pdf, tmp_path, lex, CountingEngine(), monkeypatch, on_page=lambda n, d: None)
    assert set(summary["stage_seconds"]) == set(STAGES)
    assert all(isinstance(v, float) and v >= 0 for v in summary["stage_seconds"].values())
    manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    assert set(manifest["summary"]) == {"pages", "sheets", "mean_confidence"}


def test_on_sheet_is_called_for_sheets_skipped_on_resume(pdf, lex, tmp_path, monkeypatch):
    run(pdf, tmp_path, lex, CountingEngine(), monkeypatch)
    seen: list[int] = []
    run(pdf, tmp_path, lex, CountingEngine(), monkeypatch, on_sheet=seen.append)
    assert seen == [1, 2, 3]


def test_single_sheet_book_reports_one_sheet(lex, tmp_path, monkeypatch):
    doc = pymupdf.open()
    doc.new_page(width=600, height=800)
    path = tmp_path / "una.pdf"
    doc.save(path)
    seen: list[int] = []
    summary = run(path, tmp_path / "out", lex, CountingEngine(), monkeypatch, on_sheet=seen.append)
    assert summary["sheets"] == 1 and seen == [1]
