"""Descarta el ruido del OCR que el spike midió en pestañas, logotipos y líneas de puntos."""

from pipeline.geometry import Word

MARGIN = 0.03  # franja exterior del ancho donde viven las pestañas laterales
MARGIN_MIN_CONF = 60.0
# Un número o una letra de ejercicio también vive en el margen: se descarta por baja
# confianza, nunca por ser corto (medido: el filtro por longitud quitaba 52 palabras válidas).


def _is_noise(w: Word) -> bool:
    if not any(c.isalnum() for c in w.text):
        return True  # «.........», «=», «»»
    cx = w.box[0] + w.box[2] / 2
    return (cx < MARGIN or cx > 1 - MARGIN) and w.conf < MARGIN_MIN_CONF


def drop_noise(words: list[Word]) -> list[Word]:
    return [w for w in words if not _is_noise(w)]
