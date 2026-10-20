import hashlib
import json
import logging
from pathlib import Path

import pymupdf
import pytest
from test_run import (
    BARS,
    CountingEngine,
    FakeNlp,
    FakeTranslator,
    fake_analyze,
)

from pipeline.page_json import validate_page
from publish import job
from publish.client import SupabaseError
from publish.job import JobError, run_job

BOOK = "11111111-2222-3333-4444-555555555555"


class FakeClient:
    def __init__(self, pdf_path: Path | None, *, status="queued", sha=None, claim=True):
        self.pdf_path = pdf_path
        sha = sha or hashlib.sha256(pdf_path.read_bytes()).hexdigest()
        self.book = {"id": BOOK, "sha256": sha, "status": status, "upload_path": "u1/a.pdf"}
        self.claim = claim
        self.calls: list[tuple] = []
        self.files: dict[tuple[int, str], bytes] = {}
        self.lexicon_batches: list[list[dict]] = []
        self.next_id = 1000
        self.fail_upload = False
        self.fail_delete = False

    def get_book(self, book_id):
        self.calls.append(("get_book",))
        return self.book

    def claim_book(self, book_id):
        self.calls.append(("claim_book",))
        return self.claim

    def download_upload(self, upload_path, dest):
        self.calls.append(("download_upload", upload_path))
        dest.write_bytes(self.pdf_path.read_bytes())

    def upsert_lexicon(self, rows):
        self.lexicon_batches.append(rows)
        out = {}
        for r in rows:
            out[(r["lemma"], r["pos"])] = self.next_id
            self.next_id += 1
        return out

    def upload_page_files(self, book_id, n, webp, page_json):
        if self.fail_upload:
            raise SupabaseError("upload_page: HTTP 500")
        self.files[(n, "webp")] = webp
        self.files[(n, "json")] = page_json

    def upsert_page_row(self, row):
        self.calls.append(("upsert_page_row", row["number"]))

    def set_printed_numbers(self, book_id, rows):
        self.calls.append(("set_printed_numbers", rows))

    def update_job(self, book_id, **fields):
        self.calls.append(("update_job", fields))

    def finish_book(self, book_id, *, page_count, ocr_confidence):
        self.calls.append(("finish_book", page_count, ocr_confidence))

    def fail_book(self, book_id, code):
        self.calls.append(("fail_book", code))

    def delete_upload(self, upload_path):
        if self.fail_delete:
            raise SupabaseError("delete_upload: HTTP 500")
        self.calls.append(("delete_upload", upload_path))

    def names(self):
        return [c[0] for c in self.calls]


def go(client, tmp_path, lex, monkeypatch, **kw):
    monkeypatch.setattr("pipeline.run.analyze", fake_analyze)
    return run_job(
        BOOK,
        client,
        workdir=tmp_path,
        lex=lex,
        nlp=FakeNlp(),
        translator=FakeTranslator(),
        engine=kw.pop("engine", CountingEngine()),
        dpi=72,
        **kw,
    )


def test_success_publishes_all_pages_and_marks_ready(pdf, lex, tmp_path, monkeypatch):
    c = FakeClient(pdf)
    assert go(c, tmp_path, lex, monkeypatch) == "done"
    assert sorted({n for n, _ in c.files}) == [1, 2, 3, 4]
    updates = [x[1] for x in c.calls if x[0] == "update_job"]
    assert {"pages_total": 3} in updates
    assert updates[-1] == {"pages_total": 3, "pages_done": 3}  # RF-46: hojas del PDF
    finish = next(x for x in c.calls if x[0] == "finish_book")
    assert finish[1] == 4 and finish[2] == 91.0
    assert ("delete_upload", "u1/a.pdf") in c.calls
    assert "fail_book" not in c.names()
    assert not (tmp_path / "book.pdf").exists()


def test_lexicon_ids_in_published_json_are_postgres_ids(pdf, lex, tmp_path, monkeypatch):
    c = FakeClient(pdf)
    go(c, tmp_path, lex, monkeypatch)
    page = json.loads(c.files[(1, "json")])
    validate_page(page)
    assert set(page["lex"]) == {"1000"} and page["tokens"][0]["l"] == 1000


def test_lexicon_upserted_once_per_entry_across_pages(pdf, lex, tmp_path, monkeypatch):
    c = FakeClient(pdf)
    go(c, tmp_path, lex, monkeypatch)
    assert sum(len(b) for b in c.lexicon_batches) == 1
    assert json.loads(c.files[(2, "json")])["tokens"][0]["l"] == 1000


def test_printed_numbers_set_from_manifest(pdf, lex, tmp_path, monkeypatch):
    c = FakeClient(pdf)
    go(c, tmp_path, lex, monkeypatch)
    rows = next(x[1] for x in c.calls if x[0] == "set_printed_numbers")
    assert [r["printed_number"] for r in rows] == [5, 6, 7, 8]
    assert rows[0]["image_path"] == f"{BOOK}/1.webp" and rows[0]["tokens_path"] == f"{BOOK}/1.json"


def test_hash_mismatch_fails_with_code_and_keeps_upload(pdf, lex, tmp_path, monkeypatch):
    c = FakeClient(pdf, sha="f" * 64)
    with pytest.raises(JobError) as err:
        go(c, tmp_path, lex, monkeypatch)
    assert err.value.code == "hash_mismatch"
    assert ("fail_book", "hash_mismatch") in c.calls
    assert "delete_upload" not in c.names() and not c.files


def test_too_many_pages_rejected_before_processing(pdf, lex, tmp_path, monkeypatch):
    monkeypatch.setattr(job, "MAX_PDF_PAGES", 2)
    c = FakeClient(pdf)
    engine = CountingEngine()
    with pytest.raises(JobError) as err:
        go(c, tmp_path, lex, monkeypatch, engine=engine)
    assert err.value.code == "too_many_pages" and engine.calls == 0
    assert ("fail_book", "too_many_pages") in c.calls


def test_garbage_pdf_is_invalid_pdf(lex, tmp_path, monkeypatch):
    bad = tmp_path / "bad.pdf"
    bad.write_bytes(b"esto no es un pdf")
    c = FakeClient(bad)
    with pytest.raises(JobError) as err:
        go(c, tmp_path / "w", lex, monkeypatch)
    assert err.value.code == "invalid_pdf"


def test_encrypted_pdf_is_invalid_pdf(lex, tmp_path, monkeypatch):
    doc = pymupdf.open()
    doc.new_page()
    enc = tmp_path / "enc.pdf"
    doc.save(enc, encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw="x", owner_pw="y")
    c = FakeClient(enc)
    with pytest.raises(JobError) as err:
        go(c, tmp_path / "w", lex, monkeypatch)
    assert err.value.code == "invalid_pdf"


def test_pdf_without_pages_is_empty_book(lex, tmp_path, monkeypatch):
    empty = tmp_path / "empty.pdf"
    empty.write_bytes(
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n"
        b"trailer<</Root 1 0 R/Size 3>>\n%%EOF\n"
    )
    c = FakeClient(empty)
    with pytest.raises(JobError) as err:
        go(c, tmp_path / "w", lex, monkeypatch)
    assert err.value.code == "empty_book"


@pytest.mark.parametrize("status", ["ready", "processing", "error", "deleted"])
def test_skips_when_book_not_queued(pdf, lex, tmp_path, monkeypatch, status):
    c = FakeClient(pdf, status=status)
    assert go(c, tmp_path, lex, monkeypatch) == "skipped"
    assert "claim_book" not in c.names()


def test_skips_when_book_missing(pdf, lex, tmp_path, monkeypatch):
    c = FakeClient(pdf)
    c.book = None
    assert go(c, tmp_path, lex, monkeypatch) == "skipped"


def test_claim_lost_returns_skipped(pdf, lex, tmp_path, monkeypatch):
    c = FakeClient(pdf, claim=False)
    assert go(c, tmp_path, lex, monkeypatch) == "skipped"
    assert "download_upload" not in c.names()


def test_invalid_uuid_never_touches_client(pdf, lex, tmp_path):
    c = FakeClient(pdf)
    with pytest.raises(JobError) as err:
        run_job(
            "no-es-uuid", c, workdir=tmp_path, lex=lex, nlp=FakeNlp(), translator=FakeTranslator()
        )
    assert err.value.code == "invalid_book_id" and c.calls == []


def test_processing_failure_marks_error_and_logs_no_ocr_text(
    pdf, lex, tmp_path, monkeypatch, caplog
):
    caplog.set_level(logging.DEBUG)
    c = FakeClient(pdf)
    with pytest.raises(JobError) as err:
        go(c, tmp_path, lex, monkeypatch, engine=CountingEngine(fail_on_call=2))
    assert err.value.code == "processing_failed"
    assert ("fail_book", "processing_failed") in c.calls
    assert all(BARS not in r.getMessage() for r in caplog.records)
    assert "delete_upload" not in c.names()


def test_publish_error_marks_publish_failed(pdf, lex, tmp_path, monkeypatch):
    c = FakeClient(pdf)
    c.fail_upload = True
    with pytest.raises(JobError) as err:
        go(c, tmp_path, lex, monkeypatch)
    assert err.value.code == "publish_failed"
    assert ("fail_book", "publish_failed") in c.calls


def test_failing_to_delete_the_upload_does_not_fail_the_book(pdf, lex, tmp_path, monkeypatch):
    c = FakeClient(pdf)
    c.fail_delete = True
    assert go(c, tmp_path, lex, monkeypatch) == "done"
    assert "fail_book" not in c.names()


def test_progress_counts_pdf_sheets_never_exceeding_the_total(pdf, lex, tmp_path, monkeypatch):
    """RF-46: con una doble página pages_done sigue las hojas (1..3) y nunca supera pages_total."""
    c = FakeClient(pdf)
    go(c, tmp_path, lex, monkeypatch)
    updates = [x[1] for x in c.calls if x[0] == "update_job"]
    done = [u["pages_done"] for u in updates if "pages_done" in u]
    assert done[:3] == [1, 2, 3]
    total = next(u["pages_total"] for u in updates if "pages_total" in u)
    assert total == 3 and max(done) <= total and done == sorted(done)
    assert updates[-1] == {"pages_total": 3, "pages_done": 3}


def test_progress_of_400_double_sheets_stays_within_total(tmp_path):
    """Review Focus 1: 400 hojas todas dobles (800 páginas) → la barra no pasa de 100 %."""

    class Recorder:
        def __init__(self):
            self.updates = []

        def update_job(self, book_id, **fields):
            self.updates.append(fields)

    rec = Recorder()
    pub = job._Publisher(rec, BOOK, tmp_path)
    pub.sheets(400)
    for i in range(1, 401):
        pub.sheet_done(i)
    done = [u["pages_done"] for u in rec.updates if "pages_done" in u]
    assert len(done) == 400 and max(done) == 400 and done == sorted(done)
