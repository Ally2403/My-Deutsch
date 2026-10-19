import json

import httpx
import pytest

from publish.client import Supabase, SupabaseError

KEY = "service-key-secret"
URL = "https://proj.supabase.co"


def _client(handler, sleeps=None):
    return Supabase(
        URL,
        KEY,
        transport=httpx.MockTransport(handler),
        sleep=(sleeps.append if sleeps is not None else (lambda s: None)),
    )


def test_headers_use_service_key_for_apikey_and_bearer():
    seen = {}

    def handler(request):
        seen.update(request.headers)
        return httpx.Response(200, json=[])

    _client(handler).get_book("b1")
    assert seen["apikey"] == KEY
    assert seen["authorization"] == f"Bearer {KEY}"


def test_get_book_returns_none_when_missing():
    assert _client(lambda r: httpx.Response(200, json=[])).get_book("b1") is None


def test_claim_book_true_only_when_a_row_changes():
    calls = []

    def handler(request):
        calls.append((request.method, request.url.path, request.url.params.get("status")))
        return httpx.Response(200, json=[{"id": "b1"}] if "books" in request.url.path else [])

    assert _client(handler).claim_book("b1") is True
    assert ("PATCH", "/rest/v1/jobs", "eq.queued") in calls
    assert _client(lambda r: httpx.Response(200, json=[])).claim_book("b1") is False


def test_upsert_lexicon_maps_lemma_pos_to_id_in_batches_of_500():
    batches = []

    def handler(request):
        rows = json.loads(request.content)
        batches.append(len(rows))
        assert request.url.params["on_conflict"] == "lemma,pos"
        assert "merge-duplicates" in request.headers["prefer"]
        return httpx.Response(
            201,
            json=[
                {"id": 1000 + i, "lemma": r["lemma"], "pos": r["pos"]} for i, r in enumerate(rows)
            ],
        )

    rows = [{"lemma": f"w{i}", "pos": "noun", "senses": []} for i in range(1200)]
    ids = _client(handler).upsert_lexicon(rows)
    assert batches == [500, 500, 200]
    assert ids[("w0", "noun")] == 1000
    assert len(ids) == 1200


def test_lexicon_body_is_json_with_quotes_and_unicode():
    bodies = []

    def handler(request):
        bodies.append(request.content)
        rows = json.loads(request.content)
        return httpx.Response(201, json=[{"id": 1, **{k: rows[0][k] for k in ("lemma", "pos")}}])

    _client(handler).upsert_lexicon([{"lemma": "Ä'ß\"", "pos": "noun", "senses": []}])
    assert json.loads(bodies[0])[0]["lemma"] == "Ä'ß\""


def test_retries_5xx_then_succeeds():
    sleeps, attempts = [], []

    def handler(request):
        attempts.append(1)
        return httpx.Response(503) if len(attempts) < 3 else httpx.Response(200, json=[])

    _client(handler, sleeps).get_book("b1")
    assert len(attempts) == 3
    assert sleeps == [1, 2]


def test_retries_transport_errors():
    attempts = []

    def handler(request):
        attempts.append(1)
        if len(attempts) < 2:
            raise httpx.ConnectError("boom")
        return httpx.Response(200, json=[])

    _client(handler).get_book("b1")
    assert len(attempts) == 2


def test_gives_up_after_three_attempts():
    attempts = []

    def handler(request):
        attempts.append(1)
        return httpx.Response(502)

    with pytest.raises(SupabaseError, match="HTTP 502"):
        _client(handler).get_book("b1")
    assert len(attempts) == 3


def test_4xx_fails_immediately_without_leaking_key():
    attempts = []

    def handler(request):
        attempts.append(1)
        return httpx.Response(401, text=f"bad key {KEY}")

    with pytest.raises(SupabaseError) as err:
        _client(handler).get_book("b1")
    assert len(attempts) == 1
    assert KEY not in str(err.value) and KEY not in repr(err.value)
    assert "HTTP 401" in str(err.value)


def test_upload_sends_upsert_header_and_content_type():
    seen = []

    def handler(request):
        h = request.headers
        seen.append((request.url.path, h["content-type"], h["x-upsert"]))
        return httpx.Response(200, json={})

    _client(handler).upload_page_files("b1", 3, b"webp", b"{}")
    assert ("/storage/v1/object/pages/b1/3.webp", "image/webp", "true") in seen
    assert ("/storage/v1/object/pages/b1/3.json", "application/json", "true") in seen


def test_download_streams_to_file(tmp_path):
    def handler(request):
        assert request.url.path == "/storage/v1/object/uploads/u1/a.pdf"
        return httpx.Response(200, content=b"%PDF-1.7 data")

    dest = tmp_path / "book.pdf"
    _client(handler).download_upload("u1/a.pdf", dest)
    assert dest.read_bytes() == b"%PDF-1.7 data"


def test_finish_and_fail_update_book_and_job():
    calls = []

    def handler(request):
        calls.append((request.method, request.url.path, json.loads(request.content)))
        return httpx.Response(200, json=[])

    c = _client(handler)
    c.finish_book("b1", page_count=4, ocr_confidence=93.5)
    c.fail_book("b1", "hash_mismatch")
    by_path = [(m, p, b.get("status")) for m, p, b in calls]
    assert ("PATCH", "/rest/v1/books", "ready") in by_path
    assert ("PATCH", "/rest/v1/jobs", "ready") in by_path
    assert ("PATCH", "/rest/v1/books", "error") in by_path
    assert any(b.get("error") == "hash_mismatch" for _, _, b in calls)
