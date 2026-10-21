"""RF-51: el job recorre libros, es idempotente y nunca deja un libro a medias."""

import json
import logging

from publish.client import SupabaseError
from upgrade.job import run_upgrade


class Tr:
    def from_german_many(self, texts):
        return [f"es:{t}" for t in texts]


def starts(tokens, nlp):
    return [i == 0 for i, _ in enumerate(tokens)]


def page_bytes(**extra):
    words = ["Das", "ist", "gut."]
    p = {
        "v": 1,
        "size": [100, 200],
        "lines": [[0, 2]],
        "paragraphs": [[0, 2]],
        "images": [],
        "fields": [],
        "tokens": [
            {"t": w, "b": [0.1 * i, 0.1, 0.05, 0.02], "c": 0.9} for i, w in enumerate(words)
        ],
        "lex": {},
    }
    p.update(extra)
    return json.dumps(p).encode()


class Fake:
    def __init__(self, books):
        self.versions = {b: 1 for b in books}
        self.files = {f"{b}/{n}.json": page_bytes() for b in books for n in (1, 2)}
        self.fail_download = set()
        self.fail_upload = set()
        self.uploads = []

    def books_to_upgrade(self, version):
        return [b for b, v in self.versions.items() if v < version]

    def list_pages(self, book_id):
        return [{"number": n, "tokens_path": f"{book_id}/{n}.json"} for n in (1, 2)]

    def download_page_json(self, path):
        if path in self.fail_download:
            raise SupabaseError("download_page_json: HTTP 500")
        return self.files[path]

    def upload_page_json(self, path, data):
        if path in self.fail_upload:
            raise SupabaseError("upload_page_json: HTTP 500")
        self.uploads.append(path)
        self.files[path] = data

    def set_pipeline_version(self, book_id, version):
        self.versions[book_id] = version


def run(client, **kw):
    return run_upgrade(client, nlp=None, translator=Tr(), starts=starts, version=2, **kw)


def test_upgrades_all_pages_then_writes_version():
    c = Fake(["a"])
    summary = run(c)
    assert summary == {"upgraded": 1, "failed": 0, "pages": 2, "skipped_pages": 0}
    assert c.versions["a"] == 2
    assert "sents" in json.loads(c.files["a/1.json"])


def test_second_run_is_noop():
    c = Fake(["a"])
    run(c)
    c.uploads.clear()
    assert run(c)["upgraded"] == 0
    assert c.uploads == []


def test_failed_page_leaves_book_unversioned_and_other_books_continue():
    c = Fake(["a", "b"])
    c.fail_upload.add("a/2.json")
    summary = run(c)
    assert summary["upgraded"] == 1 and summary["failed"] == 1
    assert c.versions == {"a": 1, "b": 2}
    for body in c.files.values():
        json.loads(body)  # todo JSON sigue siendo válido


def test_resume_skips_pages_already_done():
    c = Fake(["a"])
    c.fail_upload.add("a/2.json")
    run(c)
    c.fail_upload.clear()
    c.uploads.clear()
    summary = run(c)
    assert c.uploads == ["a/2.json"]
    assert summary["skipped_pages"] == 1 and c.versions["a"] == 2


def test_corrupt_json_fails_only_that_book():
    c = Fake(["a", "b"])
    c.files["a/1.json"] = b"no es json"
    summary = run(c)
    assert summary["failed"] == 1 and c.versions == {"a": 1, "b": 2}


def test_dry_run_writes_nothing():
    c = Fake(["a"])
    summary = run(c, dry_run=True)
    assert c.uploads == [] and c.versions["a"] == 1
    assert summary["upgraded"] == 0 and summary["pages"] == 2


def test_only_book_id_filter():
    c = Fake(["a", "b"])
    run(c, only=["b"])
    assert c.versions == {"a": 1, "b": 2}


def test_log_has_no_page_text_or_paths(caplog):
    c = Fake(["a"])
    with caplog.at_level(logging.INFO):
        run(c)
    text = caplog.text
    assert "Das" not in text and "es:" not in text and ".json" not in text
