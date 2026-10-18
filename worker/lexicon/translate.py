"""Acepciones en español (ADR-003): traducción de Wiktionary o, si falta, Argos en→es."""

import hashlib
import logging
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Protocol

from lexicon.store import Entry

MAX_SENSES = 5
# Huella del paquete Argos en→es (obtenida el 2026-10-17 con `provision --print-hash`). Si Argos
# publica un modelo nuevo, la instalación falla cerrada hasta revisar y actualizar esta huella.
ARGOS_MODEL_SHA256 = "d698d0ef87ad70d5d184b7fa6965905bf4368f09a2bb9ffb165a79bac96af0c4"
log = logging.getLogger(__name__)


class Translator(Protocol):
    def translate(self, text: str) -> str: ...


class NullTranslator:
    """Sin traducción automática: solo quedan las acepciones de Wiktionary en español."""

    def translate(self, text: str) -> str:
        return ""


def verify_sha256(path: Path, expected: str) -> None:
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if not expected or actual != expected.lower():
        raise ValueError(f"La huella SHA-256 del modelo no coincide (obtenida {actual})")


def _load_translation():
    """Traducción en→es ya instalada, o None. Nunca descarga nada."""
    try:
        from argostranslate import translate
    except ImportError as exc:
        raise RuntimeError("Falta el extra «argos»: uv sync --extra argos") from exc
    return translate.get_translation_from_codes("en", "es")


class ArgosTranslator:
    """Traducción automática offline en→es. Solo carga un modelo ya instalado y verificado."""

    def __init__(self) -> None:
        translation = _load_translation()
        if translation is None:
            raise RuntimeError(
                "El modelo Argos en→es no está instalado: ejecuta "
                "`python -m lexicon.translate provision --sha256 <huella>`"
            )
        self._translation = translation

    def translate(self, text: str) -> str:
        return self._translation.translate(text)


def provision_model(expected_sha256: str | None = None) -> str:
    """Paso explícito de aprovisionamiento (imagen o job de preparación, nunca en el uso):
    descarga el modelo, comprueba su SHA-256 y solo entonces lo instala. Sin huella esperada
    solo imprime la obtenida, para fijarla en el repositorio."""
    from argostranslate import package

    package.update_package_index()
    wanted = next(
        p for p in package.get_available_packages() if p.from_code == "en" and p.to_code == "es"
    )
    # Se copia a un directorio privado y se verifica e instala esa misma copia: así no hay
    # ventana entre comprobar la huella y usar el archivo (TOCTOU).
    with tempfile.TemporaryDirectory() as tmp:
        local = Path(tmp) / "modelo.argosmodel"
        shutil.copyfile(wanted.download(), local)
        actual = hashlib.sha256(local.read_bytes()).hexdigest()
        if expected_sha256 is None:
            return actual
        verify_sha256(local, expected_sha256)
        package.install_from_path(str(local))
    return actual


def senses_for(entry: Entry, translator: Translator) -> list[dict]:
    """Hasta 5 acepciones: primero las de Wiktionary en español (`m: False`), luego glosas
    inglesas traducidas (`m: True`). Sin duplicados; si el traductor falla, se omite la glosa."""
    senses: list[dict] = []
    seen: set[str] = set()

    def add(text: str, machine: bool) -> None:
        text = text.strip()
        if text and text.lower() not in seen and len(senses) < MAX_SENSES:
            seen.add(text.lower())
            senses.append({"es": text, "m": machine})

    for es in entry.glosses_es:
        add(es, False)
    for gloss in entry.glosses_en:
        if len(senses) >= MAX_SENSES:
            break
        try:
            add(translator.translate(gloss), True)
        except Exception as exc:  # noqa: BLE001 - un fallo del modelo no debe romper la página
            log.warning("traducción omitida: %s", type(exc).__name__)
    return senses


def expected_sha256(args: list[str]) -> str | None:
    """Huella esperada: la fijada en el repositorio, `--sha256 X` para otra, o None con
    `--print-hash` (solo descarga y muestra la huella, sin instalar)."""
    if "--print-hash" in args:
        return None
    return args[args.index("--sha256") + 1] if "--sha256" in args else ARGOS_MODEL_SHA256


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] != ["provision"]:
        sys.exit("Uso: python -m lexicon.translate provision [--sha256 HUELLA | --print-hash]")
    sha = expected_sha256(args[1:])
    digest = provision_model(sha)
    print(f"SHA-256 del modelo: {digest}" + (" (instalado)" if sha else " (sin instalar)"))
