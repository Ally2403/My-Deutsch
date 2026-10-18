import pytest

from publish import __main__ as entry
from publish.job import JobError

BOOK = "11111111-2222-3333-4444-555555555555"
ENV = {"SUPABASE_URL": "https://p.supabase.co", "SUPABASE_SERVICE_ROLE_KEY": "secret-key-123"}


def test_main_requires_env_without_echoing_values(capsys):
    code = entry.main(["--book-id", BOOK, "--lexicon", "x.sqlite"], {"SUPABASE_URL": "https://p"})
    out = capsys.readouterr()
    assert code == 2
    assert "SUPABASE_SERVICE_ROLE_KEY" in out.err and "https://p" not in out.err + out.out


def test_main_rejects_bad_uuid_with_exit_1_before_loading_models(monkeypatch, capsys):
    monkeypatch.setattr(entry, "_load", lambda *a: pytest.fail("no debe cargar modelos"))
    code = entry.main(["--book-id", "no-es-uuid", "--lexicon", "x.sqlite"], ENV)
    assert code == 1
    assert "invalid_book_id" in capsys.readouterr().err


@pytest.mark.parametrize(("result", "code"), [("done", 0), ("skipped", 0)])
def test_main_exit_0_on_done_or_skipped(monkeypatch, result, code):
    monkeypatch.setattr(entry, "_load", lambda *a: (object(), object(), object()))
    monkeypatch.setattr(entry, "run_job", lambda *a, **k: result)
    assert entry.main(["--book-id", BOOK, "--lexicon", "x.sqlite"], ENV) == code


def test_main_exit_1_when_job_fails_without_leaking_key(monkeypatch, capsys):
    def boom(*a, **k):
        raise JobError("hash_mismatch")

    monkeypatch.setattr(entry, "_load", lambda *a: (object(), object(), object()))
    monkeypatch.setattr(entry, "run_job", boom)
    code = entry.main(["--book-id", BOOK, "--lexicon", "x.sqlite"], ENV)
    out = capsys.readouterr()
    assert code == 1 and "hash_mismatch" in out.err
    assert "secret-key-123" not in out.err + out.out
