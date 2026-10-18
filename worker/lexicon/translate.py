"""Acepciones en español (ADR-003): traducción de Wiktionary o, si falta, Argos en→es."""

import logging
from typing import Protocol

from lexicon.store import Entry

MAX_SENSES = 5
log = logging.getLogger(__name__)


class Translator(Protocol):
    def translate(self, text: str) -> str: ...


class ArgosTranslator:
    """Traducción automática offline en→es. Instala el modelo la primera vez."""

    def __init__(self) -> None:
        from argostranslate import package, translate

        installed = {(lang.code) for lang in translate.get_installed_languages()}
        if (
            not {"en", "es"} <= installed
            or translate.get_translation_from_codes("en", "es") is None
        ):
            package.update_package_index()
            wanted = next(
                p
                for p in package.get_available_packages()
                if p.from_code == "en" and p.to_code == "es"
            )
            package.install_from_path(wanted.download())
        self._translate = translate

    def translate(self, text: str) -> str:
        return self._translate.translate(text, "en", "es")


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
