"""Limpieza de glosas inglesas de Wiktionary antes de traducirlas (RF-43, ADR-007)."""

import re

MAX_FRAGMENT = 40
BRACKETS = re.compile(r"\([^()]*\)|\[[^\[\]]*\]")  # el más interno
STRAY = re.compile(r"[()\[\]“”\"]")
# Fórmulas de definición: describen la palabra en vez de nombrarla, y traducidas dan
# «el acto de ayudar» o «una cosa o persona que ayuda».
FORMULA = re.compile(
    r"^(?:(?:the\s+)?(?:act|process|state|fact|quality|condition)\s+of\b"
    r"|(?:a|an|the)\s+(?:thing|person|someone|something)(?:\s+or\s+\w+)?\s+(?:that|who)\b"
    r"|(?:someone|something|one)\s+(?:that|who)\b"
    r"|used\s+(?:in|as|to)\b"
    r"|clipping\s+of\b)",
    re.IGNORECASE,
)


def _is_formula(fragment: str) -> bool:
    return bool(
        FORMULA.match(fragment) or re.search(r"\b(?:the )?act of\b", fragment, re.IGNORECASE)
    )


def _without_brackets(text: str) -> str:
    """Quita los paréntesis y corchetes con su contenido, también los anidados."""
    previous = None
    while previous != text:
        previous, text = text, BRACKETS.sub("", text)
    return text


def clean_glosses(glosses: list[str]) -> list[str]:
    """Fragmentos cortos y únicos (sin distinguir mayúsculas) en el orden de aparición."""
    out: list[str] = []
    seen: set[str] = set()
    for gloss in glosses:
        for fragment in re.split(r"[;,]", STRAY.sub("", _without_brackets(gloss))):
            fragment = " ".join(fragment.split())
            key = fragment.lower()
            if not fragment or len(fragment) > MAX_FRAGMENT or _is_formula(fragment):
                continue
            if key not in seen:
                seen.add(key)
                out.append(fragment)
    return out
