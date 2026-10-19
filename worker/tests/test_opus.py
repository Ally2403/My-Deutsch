import hashlib
import re
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

from lexicon import opus
from lexicon.opus import (
    MODEL_PINS,
    ModelPin,
    OpusTranslator,
    provision,
    verify_files,
    verify_installed,
)


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


def test_verify_installed_accepts_what_provision_installed(tmp_path, fake_hub):
    pin = pin_for(FILES)
    provision(pins={"de-es": pin}, models_dir=tmp_path)
    verify_installed(tmp_path / "de-es", pin)


def test_verify_installed_rejects_a_tampered_model(tmp_path, fake_hub):
    pin = pin_for(FILES)
    provision(pins={"de-es": pin}, models_dir=tmp_path)
    (tmp_path / "de-es" / "model.bin").write_bytes(b"otro modelo")
    with pytest.raises(ValueError, match="alterado"):
        verify_installed(tmp_path / "de-es", pin)


def test_verify_installed_rejects_an_extra_or_missing_file(tmp_path, fake_hub):
    pin = pin_for(FILES)
    provision(pins={"de-es": pin}, models_dir=tmp_path)
    (tmp_path / "de-es" / "extra.bin").write_bytes(b"x")
    with pytest.raises(ValueError, match="alterado"):
        verify_installed(tmp_path / "de-es", pin)
    (tmp_path / "de-es" / "extra.bin").unlink()
    (tmp_path / "de-es" / "model.bin").unlink()
    with pytest.raises(ValueError, match="alterado"):
        verify_installed(tmp_path / "de-es", pin)


def test_a_forged_marker_does_not_skip_reinstalling(tmp_path, fake_hub):
    pin = pin_for(FILES)
    provision(pins={"de-es": pin}, models_dir=tmp_path)
    (tmp_path / "de-es" / "model.bin").write_bytes(b"otro modelo")  # el marcador sigue igual
    provision(pins={"de-es": pin}, models_dir=tmp_path)
    assert len(fake_hub["converted"]) == 2
    assert (tmp_path / "de-es" / "model.bin").read_bytes() == b"ct2"


def test_the_translator_rejects_an_installed_model_that_was_tampered(tmp_path, monkeypatch):
    for key in MODEL_PINS:
        (tmp_path / key).mkdir()
        (tmp_path / key / "model.bin").write_bytes(b"sin registro")
    with pytest.raises(RuntimeError, match="alterado|no está instalado"):
        OpusTranslator(tmp_path)


def test_provision_refuses_a_symlinked_target_and_leaves_its_destination_alone(tmp_path, fake_hub):
    victim = tmp_path / "victima"
    victim.mkdir()
    (victim / "importante.txt").write_text("no borrar")
    models = tmp_path / "modelos"
    models.mkdir()
    try:
        (models / "de-es").symlink_to(victim, target_is_directory=True)
    except OSError:
        pytest.skip("sin permiso para crear enlaces simbólicos")
    with pytest.raises(ValueError, match="enlace simbólico"):
        provision(pins={"de-es": pin_for(FILES)}, models_dir=models)
    assert (victim / "importante.txt").read_text() == "no borrar"


def test_engine_tokenizes_with_sentencepiece_limits_threads_and_caches(tmp_path, monkeypatch):
    seen: dict = {"batches": []}

    class FakeTranslator:
        def __init__(self, path, **options):
            seen["options"] = options

        def translate_batch(self, batch, **options):
            seen["batches"].append((batch, options))
            return [SimpleNamespace(hypotheses=[["▁la", "▁ayuda", "</s>"]])]

    class FakeSentencePiece:
        def __init__(self, model_file):
            seen.setdefault("models", []).append(Path(model_file).name)

        def encode(self, text, out_type=str):
            return ["▁" + word for word in text.split()]

        def decode(self, pieces):
            return "".join(pieces).replace("▁", " ").strip()

    monkeypatch.setitem(sys.modules, "ctranslate2", SimpleNamespace(Translator=FakeTranslator))
    monkeypatch.setitem(
        sys.modules, "sentencepiece", SimpleNamespace(SentencePieceProcessor=FakeSentencePiece)
    )
    engine = opus._Engine(tmp_path)
    assert engine.translate("die Hilfe") == "la ayuda"
    assert engine.translate("die Hilfe") == "la ayuda"
    assert seen["models"] == ["source.spm", "target.spm"]
    assert seen["options"]["intra_threads"] == 2  # con dos modelos, todos los núcleos se estorban
    assert len(seen["batches"]) == 1  # la segunda vez sale de la caché
    batch, options = seen["batches"][0]
    assert batch == [["▁die", "▁Hilfe", "</s>"]]
    assert options["beam_size"] == 4 and options["max_decoding_length"] == 24
