import hashlib
import re
from pathlib import Path

import pytest

from lexicon import opus
from lexicon.opus import MODEL_PINS, ModelPin, OpusTranslator, provision, verify_files


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pin_for(files: dict[str, bytes]) -> ModelPin:
    return ModelPin("org/modelo", "a" * 40, {name: sha(data) for name, data in files.items()})


def write(directory: Path, files: dict[str, bytes]) -> None:
    for name, data in files.items():
        (directory / name).write_bytes(data)


FILES = {"config.json": b"{}", "source.spm": b"spm"}


def test_verify_files_accepts_the_pinned_files(tmp_path):
    write(tmp_path, FILES)
    verify_files(tmp_path, pin_for(FILES))


def test_verify_files_rejects_a_modified_file(tmp_path):
    write(tmp_path, {**FILES, "source.spm": b"otro"})
    with pytest.raises(ValueError, match="no coincide"):
        verify_files(tmp_path, pin_for(FILES))


def test_verify_files_rejects_a_missing_file(tmp_path):
    write(tmp_path, {"config.json": b"{}"})
    with pytest.raises(ValueError, match="Falta"):
        verify_files(tmp_path, pin_for(FILES))


@pytest.fixture
def fake_hub(monkeypatch):
    """Descarga y conversión falsas: registra qué se convirtió."""
    state = {"converted": [], "content": dict(FILES)}

    def download(pin, directory):
        write(directory, state["content"])

    def convert(source, target):
        state["converted"].append(sorted(p.name for p in source.iterdir()))
        target.mkdir(parents=True)
        (target / "model.bin").write_bytes(b"ct2")

    monkeypatch.setattr(opus, "_download", download)
    monkeypatch.setattr(opus, "_convert", convert)
    return state


def test_provision_converts_verified_files_and_installs_the_result(tmp_path, fake_hub):
    pins = {"de-es": pin_for(FILES)}
    provision(pins=pins, models_dir=tmp_path)
    assert fake_hub["converted"] == [["config.json", "source.spm"]]
    assert (tmp_path / "de-es" / "model.bin").read_bytes() == b"ct2"


def test_provision_with_a_wrong_checksum_converts_and_installs_nothing(tmp_path, fake_hub):
    pins = {"de-es": pin_for({**FILES, "source.spm": b"distinto"})}
    with pytest.raises(ValueError, match="no coincide"):
        provision(pins=pins, models_dir=tmp_path)
    assert fake_hub["converted"] == []
    assert not (tmp_path / "de-es").exists()


def test_provision_print_hash_reports_hashes_without_converting(tmp_path, fake_hub):
    pins = {"de-es": ModelPin("org/modelo", "a" * 40, {"config.json": "", "source.spm": ""})}
    result = provision(print_hash=True, pins=pins, models_dir=tmp_path)
    assert result == {"de-es": {name: sha(data) for name, data in FILES.items()}}
    assert fake_hub["converted"] == []


def test_provision_skips_models_already_installed_for_the_same_pin(tmp_path, fake_hub):
    pins = {"de-es": pin_for(FILES)}
    provision(pins=pins, models_dir=tmp_path)
    provision(pins=pins, models_dir=tmp_path)
    assert len(fake_hub["converted"]) == 1


def test_provision_reinstalls_when_the_pin_changes(tmp_path, fake_hub):
    provision(pins={"de-es": pin_for(FILES)}, models_dir=tmp_path)
    fake_hub["content"] = {**FILES, "source.spm": b"nuevo"}
    provision(pins={"de-es": pin_for(fake_hub["content"])}, models_dir=tmp_path)
    assert len(fake_hub["converted"]) == 2


def test_the_pins_are_fixed_in_the_repository():
    assert set(MODEL_PINS) == {"de-es", "en-es"}
    for pin in MODEL_PINS.values():
        assert re.fullmatch(r"[0-9a-f]{40}", pin.revision)
        assert pin.files and all(re.fullmatch(r"[0-9a-f]{64}", h) for h in pin.files.values())


def test_the_translator_fails_closed_when_a_model_is_not_installed(tmp_path):
    with pytest.raises(RuntimeError, match="no está instalado"):
        OpusTranslator(tmp_path)


@pytest.mark.slow
def test_opus_translates_both_directions():
    t = OpusTranslator()
    assert "ayuda" in t.from_german("die Hilfe").lower()
    assert "casa" in t.from_english("house").lower()
