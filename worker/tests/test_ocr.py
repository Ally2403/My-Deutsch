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
    def hang(png, *args):
        raise TimeoutError("Tesseract")

    monkeypatch.setattr(ocr, "tesseract", hang)
    assert ocr.osd_rotation(b"png") == 0
