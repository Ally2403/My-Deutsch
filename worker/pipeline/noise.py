"""Descarta el ruido del OCR que el spike midió en pestañas, logotipos y líneas de puntos."""

from pipeline.geometry import Word

MARGIN = 0.05  # franja exterior del ancho donde viven las pestañas laterales
MARGIN_MIN_CONF = 60.0
MARGIN_MAX_LEN = 3


def _is_noise(w: Word) -> bool:
    if not any(c.isalnum() for c in w.text):
        return True  # «.........», «=», «»»
    cx = w.box[0] + w.box[2] / 2
    in_margin = cx < MARGIN or cx > 1 - MARGIN
    return in_margin and (w.conf < MARGIN_MIN_CONF or len(w.text) <= MARGIN_MAX_LEN)


def drop_noise(words: list[Word]) -> list[Word]:
    return [w for w in words if not _is_noise(w)]
