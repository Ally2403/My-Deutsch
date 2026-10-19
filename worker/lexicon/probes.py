"""Sondas de traducción y normalización de sus salidas (RF-43, ADR-007).

Un traductor automático rinde mal con una palabra suelta: un verbo sale como gerundio y un
sustantivo sin artículo se confunde. La sonda da el contexto gramatical mínimo («die Hilfe»,
«Ich möchte aufstehen.») y la salida se limpia hasta dejar solo la acepción."""

import re

ARTICLE = {"m": "der", "f": "die", "n": "das"}
SPANISH_ARTICLE = re.compile(r"^(?:el|la|los|las|un|una)\s+", re.IGNORECASE)
WANT = re.compile(r"^(?:quiero|quisiera|deseo)\s+", re.IGNORECASE)
INFINITIVE = re.compile(r"^[a-zñáéíóúü]*(?:ar|er|ir|ír)(?:se)?$")
# Infinitivo con pronombre pegado («levantarme», «comprenderlo»): «me» pasa a «se», el resto se
# quita.
CLITIC = re.compile(r"^([a-zñáéíóúü]*(?:ar|er|ir|ír))(me|te|lo|la)$")


def german_probe(lemma: str, pos: str, genders: list[str]) -> str:
    if pos == "noun" and genders:
        return f"{ARTICLE[genders[0]]} {lemma}"
    if pos == "verb":
        return f"Ich möchte {lemma}."
    return lemma


def english_probe(gloss: str, pos: str) -> str:
    if pos == "verb":
        return f"I want to {re.sub(r'^to\s+', '', gloss)}."
    return gloss


def _infinitive(text: str) -> str | None:
    words = text.split()
    if not words:
        return None
    first = words[0].lower()
    if match := CLITIC.match(first):
        first = match.group(1) + ("se" if match.group(2) == "me" else "")
    if not INFINITIVE.match(first):
        return None
    return " ".join([first, *words[1:]])


def clean_output(text: str, pos: str, source: str) -> str | None:
    """Acepción lista para mostrar, o None si la salida no sirve."""
    text = text.strip().strip(".,:;!¡?¿ ").strip()
    if pos == "noun":
        text = SPANISH_ARTICLE.sub("", text)
    elif pos == "verb":
        text = WANT.sub("", text)
        text = _infinitive(text) or ""
    text = text[:1].lower() + text[1:]
    if not text or text.lower() == source.lower():
        return None
    return text
