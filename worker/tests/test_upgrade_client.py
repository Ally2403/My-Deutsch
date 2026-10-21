"""RF-51: métodos del cliente de Supabase usados por el modo upgrade."""

import json

import httpx

from pipeline.version import PIPELINE_VERSION
from publish.client import Supabase


def _client(handler):
    return Supabase(
        "https://proj.supabase.co",
        "service-key-secret",
        transport=httpx.MockTransport(handler),
        sleep=lambda s: None,
    )


def test_finish_book_writes_current_pipeline_version():
    bodies = []

    def handler(request):
        bodies.append(json.loads(request.content))
        return httpx.Response(200, json=[{"id": "b1"}])

    _client(handler).finish_book("b1", page_count=4, ocr_confidence=90.0)
    assert bodies[0]["pipeline_version"] == PIPELINE_VERSION


def test_books_to_upgrade_filters_ready_and_older_versions():
    seen = {}

    def handler(request):
        seen.update(request.url.params)
        return httpx.Response(200, json=[{"id": "b1"}, {"id": "b2"}])

    assert _client(handler).books_to_upgrade(2) == ["b1", "b2"]
    assert seen["status"] == "eq.ready"
    assert seen["pipeline_version"] == "lt.2"


def test_list_pages_and_page_json_roundtrip():
    calls = []

    def handler(request):
        calls.append((request.method, request.url.path, request.headers.get("x-upsert")))
        if request.url.path == "/rest/v1/pages":
            return httpx.Response(200, json=[{"number": 1, "tokens_path": "b1/1.json"}])
        if request.method == "GET":
            return httpx.Response(200, content=b'{"v":1}')
        return httpx.Response(200, json={})

    c = _client(handler)
    assert c.list_pages("b1") == [{"number": 1, "tokens_path": "b1/1.json"}]
    assert c.download_page_json("b1/1.json") == b'{"v":1}'
    c.upload_page_json("b1/1.json", b"{}")
    assert ("GET", "/storage/v1/object/pages/b1/1.json", None) in calls
    assert ("POST", "/storage/v1/object/pages/b1/1.json", "true") in calls


def test_set_pipeline_version_patches_only_that_column():
    bodies = []

    def handler(request):
        bodies.append((request.url.path, json.loads(request.content)))
        return httpx.Response(200, json=[{"id": "b1"}])

    _client(handler).set_pipeline_version("b1", 2)
    assert bodies == [("/rest/v1/books", {"pipeline_version": 2})]
