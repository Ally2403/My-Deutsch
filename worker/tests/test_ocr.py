import subprocess

import pytest

from pipeline import ocr


def test_tesseract_has_a_wall_clock_limit(monkeypatch):
    seen = {}

    def fake_run(cmd, **kwargs):
        seen.update(kwargs)
        return subprocess.CompletedProcess(cmd, 0, stdout=b"ok")

    monkeypatch.setattr(ocr.subprocess, "run", fake_run)
    assert ocr.tesseract(b"png", "--psm", "3") == "ok"
    assert seen["timeout"] == ocr.OCR_TIMEOUT_S


def test_a_hung_tesseract_becomes_a_clear_timeout_error(monkeypatch):
    def hang(cmd, **kwargs):
        raise subprocess.TimeoutExpired(cmd, kwargs["timeout"])

    monkeypatch.setattr(ocr.subprocess, "run", hang)
    with pytest.raises(TimeoutError, match="Tesseract"):
        ocr.tesseract(b"png")


def test_a_timeout_in_orientation_detection_degrades_to_no_rotation(monkeypatch):
    def hang(png, *args, **kwargs):
        raise TimeoutError("Tesseract")

    monkeypatch.setattr(ocr, "tesseract", hang)
    assert ocr.osd_rotation(b"png") == 0


def test_parallel_tesseract_runs_with_one_openmp_thread_each(monkeypatch):
    """RNF-18: N Tesseract a la vez no deben competir por los mismos núcleos."""
    seen = {}

    def fake_run(cmd, **kwargs):
        seen.update(kwargs)
        return subprocess.CompletedProcess(cmd, 0, stdout=b"ok")

    monkeypatch.setattr(ocr.subprocess, "run", fake_run)
    ocr.tesseract(b"png", env=ocr.single_thread_env())
    assert seen["env"]["OMP_THREAD_LIMIT"] == "1"


def test_printed_candidates_skips_a_page_whose_footer_is_a_black_band():
    # RF-46: si el 10 % inferior es negro desde su primera fila, la franja del pie queda vacía y
    # Pixmap fallaba (FzErrorArgument) en vez de seguir sin número impreso.
    import numpy as np

    page = np.full((1000, 800), 255, np.uint8)
    page[850:] = 0
    assert ocr.printed_candidates(page) == []
