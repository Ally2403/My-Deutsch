"""Traducción offline con Opus-MT (Helsinki-NLP) convertido a CTranslate2 (RF-43, ADR-007).

Los modelos se instalan en un paso explícito de aprovisionamiento (nunca en el uso): se descargan
a un directorio privado en una revisión fija, se comprueba el SHA-256 de cada archivo y solo
entonces se convierten e instalan. Si algo no coincide, no se instala nada."""

import hashlib
import json
import os
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

MODELS_DIR = Path(
    os.environ.get("MYDEUTSCH_MODELS_DIR", Path.home() / ".local" / "share" / "mydeutsch-models")
)
MARKER = "pin.json"
# Archivos que el tokenizador necesita junto al modelo convertido.
TOKENIZER_FILES = ("source.spm", "target.spm")


@dataclass(frozen=True)
class ModelPin:
    repo: str
    revision: str  # commit del repositorio de Hugging Face
    files: dict[str, str]  # archivo → SHA-256


# Revisiones y huellas obtenidas el 2026-10-18 con `provision --print-hash`. Si el repositorio
# publica otra revisión, no se instala hasta revisar y actualizar estas huellas.
MODEL_PINS: dict[str, ModelPin] = {
    "de-es": ModelPin(
        "Helsinki-NLP/opus-mt-de-es",
        "0c0187af74abb222c9d53a672e41dec7dc867b3f",
        {
            "config.json": "512cf85ef5a0e52253f2eafca0efd886a16d90c025910966dfae2ef68f4acffc",
            "generation_config.json": "55e1205dca7dc88106058631a3ff773a9643db1baab0fa489005f62c7b028374",  # noqa: E501
            "pytorch_model.bin": "30c7fea1c1e773786404f7a7cdd0ce9d7a607153efde36d44d6fe11dbf916ba7",
            "source.spm": "4c6cf9cacbfbf82db361e3e07df76172cce7d1ef683d4e7d090349c84246caf0",
            "target.spm": "d15fb47311fe1d385213350041a25dcb2f2b0ceb7d7102b7853b1405b33fd794",
            "tokenizer_config.json": "b33144660126c123b802184279637fdc24c9d84b356c2b1d1e79795ce7aa5cb7",  # noqa: E501
            "vocab.json": "5afdba8ce02954340f89ca24f6f877b3fb89d2f4d764c43e8b99bca12f7c6b0f",
        },
    ),
    "en-es": ModelPin(
        "Helsinki-NLP/opus-mt-en-es",
        "5bc4493d463cf000c1f0b50f8d56886a392ed4ab",
        {
            "config.json": "666ad3c2943674b6a789e311d221e44ec23e27f1bd9727930754bf773ec8e464",
            "generation_config.json": "837839ed0534a27084f9b980fc33f47729052dd89cb26cca7ac830765ed30e49",  # noqa: E501
            "pytorch_model.bin": "befce0f620e8e63f83bbb7f0818eb51d541cba28057a7cc14b00466d85c4994c",
            "source.spm": "4dd547c24816a335e7b0b2e63376a8f1b3cbfc671eda5ab808dd44fdadaa8791",
            "target.spm": "e236ee6d866b635c0142114f8647f39831f9d92534aa2aad75c942f6a78ad0e3",
            "tokenizer_config.json": "9859e3f8f73e2f50ab3e5cc2de432645347432956df4772d33209a346dd97f3b",  # noqa: E501
            "vocab.json": "257f346d7a6b2ecceafcca8ba05648ce2fd68dfaf105fb0e913dca7198f3f6d5",
        },
    ),
}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(1 << 20):
            digest.update(chunk)
    return digest.hexdigest()


def verify_files(directory: Path, pin: ModelPin) -> None:
    """Todos los archivos fijados deben estar y coincidir; si no, `ValueError`."""
    for name, expected in pin.files.items():
        path = directory / name
        if not path.is_file():
            raise ValueError(f"Falta el archivo {name} del modelo {pin.repo}")
        actual = _sha256(path)
        if not expected or actual != expected.lower():
            raise ValueError(
                f"La huella SHA-256 de {name} no coincide con la fijada (obtenida {actual})"
            )


def _download(pin: ModelPin, directory: Path) -> None:
    import httpx

    for name in pin.files:
        url = f"https://huggingface.co/{pin.repo}/resolve/{pin.revision}/{name}"
        with httpx.stream("GET", url, follow_redirects=True, timeout=120) as response:
            response.raise_for_status()
            with (directory / name).open("wb") as f:
                for chunk in response.iter_bytes(1 << 20):
                    f.write(chunk)


def _convert(source: Path, target: Path) -> None:
    from ctranslate2.converters import TransformersConverter

    TransformersConverter(str(source)).convert(str(target), quantization="int8")
    for name in TOKENIZER_FILES:
        shutil.copyfile(source / name, target / name)


def _fingerprint(pin: ModelPin) -> str:
    return json.dumps({"revision": pin.revision, "files": pin.files}, sort_keys=True)


def _installed_hashes(directory: Path) -> dict[str, str]:
    return {p.name: _sha256(p) for p in sorted(directory.iterdir()) if p.name != MARKER}


def verify_installed(directory: Path, pin: ModelPin) -> None:
    """El modelo instalado debe ser exactamente el que `provision` convirtió desde esta revisión:
    el registro `pin.json` coincide con el fijado y cada archivo con la huella que se registró
    al instalarlo. Un marcador copiado a mano no basta. Si no, `ValueError`."""
    bad = f"El modelo instalado en {directory} está alterado o incompleto"
    marker = directory / MARKER
    if not marker.is_file() or directory.is_symlink():
        raise ValueError(f"{bad}: falta su registro de instalación")
    try:
        record = json.loads(marker.read_text(encoding="utf-8"))
    except ValueError:
        raise ValueError(f"{bad}: su registro de instalación es ilegible") from None
    if not isinstance(record, dict) or record.get("pin") != _fingerprint(pin):
        raise ValueError(f"{bad}: no corresponde a la revisión fijada")
    entries = [p for p in directory.iterdir() if p.name != MARKER]
    if any(p.is_symlink() or not p.is_file() for p in entries):
        raise ValueError(f"{bad}: contiene algo que no es un archivo")
    installed = record.get("installed")
    if (
        not isinstance(installed, dict)
        or "model.bin" not in installed
        or _installed_hashes(directory) != installed
    ):
        raise ValueError(f"{bad}: sus archivos no coinciden con lo registrado")


def _is_current(directory: Path, pin: ModelPin) -> bool:
    try:
        verify_installed(directory, pin)
    except (ValueError, OSError):
        return False
    return True


def provision(
    print_hash: bool = False,
    pins: dict[str, ModelPin] | None = None,
    models_dir: Path | None = None,
) -> dict[str, dict[str, str]]:
    """Descarga, verifica, convierte e instala cada modelo. Con `print_hash` solo descarga y
    devuelve las huellas obtenidas (para fijarlas en el repositorio), sin instalar."""
    pins = MODEL_PINS if pins is None else pins
    models_dir = MODELS_DIR if models_dir is None else models_dir
    reported: dict[str, dict[str, str]] = {}
    for key, pin in pins.items():
        target = models_dir / key
        if not print_hash and target.is_symlink():
            raise ValueError(f"{target} es un enlace simbólico: no se instala sobre él")
        if not print_hash and _is_current(target, pin):
            continue
        # Se verifica y convierte esa misma copia privada: no hay ventana entre comprobar la
        # huella y usar el archivo (TOCTOU).
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "fuente"
            source.mkdir()
            _download(pin, source)
            if print_hash:
                reported[key] = {name: _sha256(source / name) for name in pin.files}
                continue
            verify_files(source, pin)
            models_dir.mkdir(parents=True, exist_ok=True)
            # Se prepara junto al destino para poder reemplazarlo de una sola vez.
            partial = models_dir / f".{key}.partial"
            shutil.rmtree(partial, ignore_errors=True)
            _convert(source, partial)
            record = {"pin": _fingerprint(pin), "installed": _installed_hashes(partial)}
            (partial / MARKER).write_text(json.dumps(record, sort_keys=True), encoding="utf-8")
            if target.exists():
                shutil.rmtree(target)
            os.replace(partial, target)
    return reported


class _Engine:
    """Un modelo CTranslate2 con sus tokenizadores SentencePiece (receta de Opus-MT/Marian)."""

    def __init__(self, directory: Path) -> None:
        import ctranslate2
        import sentencepiece

        # Con dos modelos cargados, los hilos por defecto (todos los núcleos) se estorban y cada
        # traducción pasa de ~50 a ~240 ms; con 2 hilos por modelo no.
        self._translator = ctranslate2.Translator(
            str(directory), device="cpu", compute_type="int8", intra_threads=2
        )
        self._source = sentencepiece.SentencePieceProcessor(
            model_file=str(directory / "source.spm")
        )
        self._target = sentencepiece.SentencePieceProcessor(
            model_file=str(directory / "target.spm")
        )
        self._cache: dict[str, str] = {}

    def translate(self, text: str) -> str:
        if text not in self._cache:
            self.translate_many([text])
        return self._cache[text]

    def translate_many(self, texts: list[str]) -> None:
        """Traduce por lote (RNF-18) lo que aún no está en la caché; una sola llamada al modelo."""
        todo = list(dict.fromkeys(t for t in texts if t not in self._cache))
        if not todo:
            return
        if len(self._cache) > 20_000:
            self._cache.clear()
        batch = [[*self._source.encode(t, out_type=str), "</s>"] for t in todo]
        results = self._translator.translate_batch(batch, beam_size=4, max_decoding_length=24)
        for text, res in zip(todo, results, strict=True):
            self._cache[text] = self._target.decode([t for t in res.hypotheses[0] if t != "</s>"])


class OpusTranslator:
    """Traducción de→es y en→es. Solo carga modelos ya instalados y verificados."""

    def __init__(self, models_dir: Path | None = None) -> None:
        models_dir = MODELS_DIR if models_dir is None else models_dir
        for key, pin in MODEL_PINS.items():
            if not (models_dir / key / "model.bin").is_file():
                raise RuntimeError(
                    f"El modelo Opus-MT {key} no está instalado: ejecuta "
                    "`python -m lexicon.opus provision`"
                )
            try:
                verify_installed(models_dir / key, pin)
            except (ValueError, OSError) as exc:
                raise RuntimeError(
                    f"{exc}; vuelve a ejecutar `python -m lexicon.opus provision`"
                ) from exc
        self._de_es = _Engine(models_dir / "de-es")
        self._en_es = _Engine(models_dir / "en-es")

    def from_german(self, text: str) -> str:
        return self._de_es.translate(text)

    def from_english(self, text: str) -> str:
        return self._en_es.translate(text)

    def warm(self, german: list[str], english: list[str]) -> None:
        """Precalcula por lote las traducciones que `senses_for` pedirá una a una."""
        self._de_es.translate_many(german)
        self._en_es.translate_many(english)


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] != ["provision"]:
        sys.exit("Uso: python -m lexicon.opus provision [--print-hash]")
    hashes = provision(print_hash="--print-hash" in args)
    print(json.dumps(hashes, indent=1) if hashes else "Modelos Opus-MT instalados")
