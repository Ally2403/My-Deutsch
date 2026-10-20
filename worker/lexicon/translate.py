"""Acepciones en español (RF-43, ADR-007): Wiktionary en español si existe; después la traducción
de la propia palabra alemana y las definiciones inglesas limpias, traducidas."""

import logging
from collections.abc import Callable
from typing import Protocol

from lexicon.glosses import clean_glosses
from lexicon.probes import clean_output, english_probe, german_probe
from lexicon.store import Entry

MAX_SENSES = 5
# Partículas e interjecciones sueltas no tienen contexto («ei» sale «huevo»): solo se usan sus
# definiciones.
NO_DIRECT_TRANSLATION = {"part", "intj"}
log = logging.getLogger(__name__)


class Translator(Protocol):
    def from_german(self, text: str) -> str: ...

    def from_english(self, text: str) -> str: ...


class NullTranslator:
    """Sin traducción automática: solo quedan las acepciones de Wiktionary en español."""

    def from_german(self, text: str) -> str:
        return ""

    def warm(self, german: list[str], english: list[str]) -> None:
        return None

    def from_english(self, text: str) -> str:
        return ""


def probes_for(entry: Entry) -> tuple[list[str], list[str]]:
    """Textos que `senses_for` enviará al traductor (alemán, inglés), para traducirlos por lote."""
    german: list[str] = []
    english: list[str] = []
    if entry.pos not in NO_DIRECT_TRANSLATION:
        german.append(german_probe(entry.lemma, entry.pos, entry.genders))
    english += [english_probe(g, entry.pos) for g in clean_glosses(entry.glosses_en)[:MAX_SENSES]]
    return german, english


def senses_for(entry: Entry, translator: Translator) -> list[dict]:
    """Hasta 5 acepciones: las de Wiktionary en español (`m: False`), la traducción de la
    palabra alemana y las definiciones inglesas limpias traducidas (`m: True`). Sin duplicados;
    si el traductor falla o la salida no sirve, esa acepción se omite."""
    senses: list[dict] = []
    seen: set[str] = set()

    def add(text: str | None, machine: bool) -> None:
        text = (text or "").strip()
        if text and text.lower() not in seen and len(senses) < MAX_SENSES:
            seen.add(text.lower())
            senses.append({"es": text, "m": machine})

    def machine_sense(translate: Callable[[str], str], probe: str, source: str) -> None:
        try:
            add(clean_output(translate(probe), entry.pos, source), True)
        except Exception as exc:  # noqa: BLE001 - un fallo del modelo no debe romper la página
            log.warning("traducción omitida: %s", type(exc).__name__)

    for es in entry.glosses_es:
        add(es, False)
    if entry.pos not in NO_DIRECT_TRANSLATION:
        machine_sense(
            translator.from_german, german_probe(entry.lemma, entry.pos, entry.genders), entry.lemma
        )
    for gloss in clean_glosses(entry.glosses_en):
        if len(senses) >= MAX_SENSES:
            break
        machine_sense(translator.from_english, english_probe(gloss, entry.pos), gloss)
    return senses
