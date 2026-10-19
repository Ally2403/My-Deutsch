import json

import httpx

from maintenance.__main__ import purge_expired
from publish.client import Supabase

URL = "https://proj.supabase.co"


def _client(handler):
    return Supabase(URL, "k", transport=httpx.MockTransport(handler), sleep=lambda s: None)


def test_expired_book_is_deleted_then_its_files_are_removed():
    calls = []
    listed = {"n": 0}

    def handler(request):
        path = request.url.path
        calls.append((request.method, path))
        if request.method == "GET" and path == "/rest/v1/books":
            assert request.url.params["delete_after"].startswith("lt.")
            return httpx.Response(200, json=[{"id": "b1"}])
        if request.method == "DELETE" and path == "/rest/v1/books":
            assert request.url.params["id"] == "eq.b1"
            assert request.url.params["delete_after"].startswith("lt.")
            return httpx.Response(200, json=[{"id": "b1"}])
        if path == "/storage/v1/object/list/pages":
            listed["n"] += 1
            names = [{"name": "1.webp"}, {"name": "1.json"}] if listed["n"] == 1 else []
            return httpx.Response(200, json=names)
        if request.method == "DELETE" and path == "/storage/v1/object/pages":
            assert json.loads(request.content)["prefixes"] == ["b1/1.webp", "b1/1.json"]
            return httpx.Response(200, json=[])
        raise AssertionError(path)

    assert purge_expired(_client(handler)) == (1, 2)
    # La fila se borra antes que los archivos: así un libro revinculado nunca pierde sus archivos.
    assert calls.index(("DELETE", "/rest/v1/books")) < calls.index(
        ("DELETE", "/storage/v1/object/pages")
    )


def test_a_book_relinked_to_a_group_is_left_alone():
    def handler(request):
        if request.method == "GET":
            return httpx.Response(200, json=[{"id": "b1"}])
        if request.url.path == "/rest/v1/books":
            return httpx.Response(200, json=[])  # delete_after ya es null
        raise AssertionError("no debe tocar el almacenamiento")

    assert purge_expired(_client(handler)) == (0, 0)


def test_one_failing_book_does_not_stop_the_rest(capsys):
    def handler(request):
        path = request.url.path
        if request.method == "GET" and path == "/rest/v1/books":
            return httpx.Response(200, json=[{"id": "bad"}, {"id": "ok"}])
        if request.method == "DELETE" and path == "/rest/v1/books":
            if request.url.params["id"] == "eq.bad":
                return httpx.Response(403, json={})
            return httpx.Response(200, json=[{"id": "ok"}])
        if path == "/storage/v1/object/list/pages":
            return httpx.Response(200, json=[])
        raise AssertionError(path)

    assert purge_expired(_client(handler)) == (1, 0)
    assert "purge bad: delete_book: HTTP 403" in capsys.readouterr().err
