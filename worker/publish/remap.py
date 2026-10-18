"""Reasigna los ids de léxico locales del registro a los ids de `public.lexicon` (ADR-003)."""

import copy

from lexicon.translate import MAX_SENSES


def remap_page(page: dict, mapping: dict[int, int]) -> dict:
    """Copia con `l` y las claves de `lex` en ids de Postgres; `KeyError` si falta alguno.

    `ValueError` si algún id de Postgres no es un entero positivo o si dos ids locales colapsan
    en el mismo (se perdería una entrada del léxico sin avisar)."""
    values = list(mapping.values())
    if any(type(v) is not int or v < 1 for v in values) or len(set(values)) != len(values):
        raise ValueError("Mapeo de léxico inválido: ids repetidos o no positivos")
    out = copy.deepcopy(page)
    for token in out["tokens"]:
        if "l" in token:
            token["l"] = mapping[token["l"]]
    out["lex"] = {str(mapping[int(key)]): entry for key, entry in out["lex"].items()}
    return out


def _bad(msg: str) -> None:
    raise ValueError(f"Entrada de léxico inválida: {msg}")


def lexicon_row(entry: dict) -> dict:
    """Entrada del registro del pipeline → fila de `public.lexicon`, con las mismas reglas que
    `validate_page`; `ValueError` si la entrada no las cumple."""
    lemma, pos, senses = entry.get("lemma"), entry.get("pos"), entry.get("senses")
    genders, plural = list(entry.get("g", [])), entry.get("pl")
    if not (isinstance(lemma, str) and isinstance(pos, str)):
        _bad("lemma y pos deben ser texto")
    if plural is not None and not isinstance(plural, str):
        _bad("el plural debe ser texto")
    if not all(g in ("m", "f", "n") for g in genders):
        _bad("géneros desconocidos")
    if not isinstance(senses, list) or len(senses) > MAX_SENSES:
        _bad(f"más de {MAX_SENSES} acepciones")
    for s in senses:
        if not (isinstance(s, dict) and isinstance(s.get("es"), str) and type(s.get("m")) is bool):
            _bad("acepción mal formada")
    return {
        "lemma": lemma,
        "pos": pos,
        "genders": genders,
        "plural": plural,
        "senses": senses,
        "source": "wiktionary",
    }
