import pytest

from lexicon.store import Entry
from lexicon.translate import ArgosTranslator, senses_for


class Fake:
    def __init__(self, table: dict[str, str] | None = None):
        self.table = table or {}
        self.calls: list[str] = []

    def translate(self, text: str) -> str:
        self.calls.append(text)
        return self.table.get(text, f"es:{text}")


def entry(en=(), es=()) -> Entry:
    return Entry("Haus", "noun", ["n"], "Häuser", list(en), list(es))


def test_uses_wiktionary_spanish_without_marking_it_as_machine():
    t = Fake()
    out = senses_for(entry(en=["house"], es=["casa", "hogar"]), t)
    assert out[:2] == [{"es": "casa", "m": False}, {"es": "hogar", "m": False}]
    assert out[2] == {"es": "es:house", "m": True}


def test_does_not_call_the_translator_when_spanish_is_enough():
    t = Fake()
    senses_for(entry(en=["a"], es=["1", "2", "3", "4", "5"]), t)
    assert t.calls == []


def test_machine_translations_are_marked():
    out = senses_for(
        entry(en=["house", "building"]), Fake({"house": "casa", "building": "edificio"})
    )
    assert out == [{"es": "casa", "m": True}, {"es": "edificio", "m": True}]


def test_duplicates_are_removed_ignoring_case():
    out = senses_for(
        entry(en=["house", "home"], es=["Casa"]), Fake({"house": "casa", "home": "hogar"})
    )
    assert [s["es"] for s in out] == ["Casa", "hogar"]


def test_never_more_than_five():
    out = senses_for(entry(en=[f"g{i}" for i in range(9)]), Fake())
    assert len(out) == 5


def test_empty_translation_is_skipped():
    out = senses_for(entry(en=["a", "b"]), Fake({"a": "  ", "b": "bé"}))
    assert out == [{"es": "bé", "m": True}]


def test_a_failing_translator_drops_the_sense_without_breaking():
    class Boom:
        def translate(self, text: str) -> str:
            raise RuntimeError("modelo no disponible")

    assert senses_for(entry(en=["house"], es=["casa"]), Boom()) == [{"es": "casa", "m": False}]


@pytest.mark.slow
def test_argos_translates_a_simple_word():
    assert "casa" in ArgosTranslator().translate("house").lower()


def test_argos_fails_closed_when_the_model_is_not_installed(monkeypatch):
    monkeypatch.setattr("lexicon.translate._load_translation", lambda: None)
    with pytest.raises(RuntimeError, match="no está instalado"):
        ArgosTranslator()


def test_model_checksum_must_match_before_installing(tmp_path):
    from lexicon.translate import verify_sha256

    f = tmp_path / "modelo.argosmodel"
    f.write_bytes(b"contenido")
    good = "3ed0e87b36cb1b62d1ba4ee4af5d8b29ac1de0adc6e8c31f8bbb98e1ea1fc3a8"
    import hashlib

    real = hashlib.sha256(b"contenido").hexdigest()
    verify_sha256(f, real)
    with pytest.raises(ValueError, match="no coincide"):
        verify_sha256(f, good)
    with pytest.raises(ValueError, match="no coincide"):
        verify_sha256(f, "")


class _FakePackage:
    """Sustituye a argostranslate.package: el modelo «descargado» y lo que se instala."""

    def __init__(self, path):
        self.path = path
        self.installed: list[tuple[str, bytes]] = []
        outer = self

        class Pkg:
            from_code, to_code = "en", "es"

            def download(self):
                return str(outer.path)

        self._pkg = Pkg()

    def update_package_index(self):
        pass

    def get_available_packages(self):
        return [self._pkg]

    def install_from_path(self, path):
        from pathlib import Path

        self.installed.append((path, Path(path).read_bytes()))


@pytest.fixture
def fake_argos(tmp_path, monkeypatch):
    import sys
    import types

    model = tmp_path / "descarga.argosmodel"
    model.write_bytes(b"modelo")
    pkg = _FakePackage(model)
    mod = types.ModuleType("argostranslate.package")
    for name in ("update_package_index", "get_available_packages", "install_from_path"):
        setattr(mod, name, getattr(pkg, name))
    parent = types.ModuleType("argostranslate")
    parent.package = mod
    monkeypatch.setitem(sys.modules, "argostranslate", parent)
    monkeypatch.setitem(sys.modules, "argostranslate.package", mod)
    return pkg, model


def test_provisioning_installs_a_verified_private_copy_not_the_downloaded_file(fake_argos):
    import hashlib

    from lexicon.translate import provision_model

    pkg, original = fake_argos
    digest = hashlib.sha256(b"modelo").hexdigest()
    assert provision_model(digest) == digest
    [(path, content)] = pkg.installed
    assert path != str(original) and content == b"modelo"


def test_provisioning_with_a_wrong_checksum_installs_nothing(fake_argos):
    from lexicon.translate import provision_model

    pkg, _ = fake_argos
    with pytest.raises(ValueError, match="no coincide"):
        provision_model("0" * 64)
    assert pkg.installed == []


def test_provisioning_without_expected_checksum_only_reports_it(fake_argos):
    from lexicon.translate import provision_model

    pkg, _ = fake_argos
    assert len(provision_model(None)) == 64
    assert pkg.installed == []


def test_the_model_checksum_is_pinned_in_the_repository():
    import re

    from lexicon.translate import ARGOS_MODEL_SHA256

    assert re.fullmatch(r"[0-9a-f]{64}", ARGOS_MODEL_SHA256)


def test_provision_cli_defaults_to_the_pinned_checksum():
    from lexicon.translate import ARGOS_MODEL_SHA256, expected_sha256

    assert expected_sha256([]) == ARGOS_MODEL_SHA256
    assert expected_sha256(["--sha256", "ab" * 32]) == "ab" * 32
    assert expected_sha256(["--print-hash"]) is None
