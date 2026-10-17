"""Métricas del spike: precisión de OCR por palabra y por clase de carácter (RNF-03)."""

import re
from difflib import SequenceMatcher

WORD = re.compile(r"\w+(?:-\w+)*")


def words(text: str) -> list[str]:
    return WORD.findall(text)


def word_accuracy(reference: str, hypothesis: str) -> float:
    """Palabras alineadas iguales / máx(palabras de referencia, palabras reconocidas)."""
    ref, hyp = words(reference), words(hypothesis)
    if not ref and not hyp:
        return 1.0
    sm = SequenceMatcher(None, ref, hyp, autojunk=False)
    matched = sum(b.size for b in sm.get_matching_blocks())
    return matched / max(len(ref), len(hyp))


def char_class_accuracy(reference: str, hypothesis: str, chars: str) -> float:
    """Fracción de apariciones de `chars` en la referencia reconocidas en su sitio."""
    ref, hyp = " ".join(words(reference)), " ".join(words(hypothesis))
    total = sum(ref.count(c) for c in chars)
    if total == 0:
        return 1.0
    sm = SequenceMatcher(None, ref, hyp, autojunk=False)
    hit = sum(
        sum(ref[b.a : b.a + b.size].count(c) for c in chars) for b in sm.get_matching_blocks()
    )
    return hit / total
