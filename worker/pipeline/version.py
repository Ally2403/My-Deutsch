"""Versión vigente del pipeline (RF-51). Súbela cuando el JSON de página gane campos que los
libros ya procesados puedan recibir con el modo «upgrade».

1: sin `sents`.  2: `sents` (traducción por oración, RF-47).
3: `sents` cortadas también por puntuación (la v2 juntaba varias oraciones en una).
"""

PIPELINE_VERSION = 3
