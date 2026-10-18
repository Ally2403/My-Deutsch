"""Reasigna los ids de léxico locales del registro a los ids de `public.lexicon` (ADR-003)."""

import copy


def remap_page(page: dict, mapping: dict[int, int]) -> dict:
    """Copia con `l` y las claves de `lex` en ids de Postgres; `KeyError` si falta alguno."""
    out = copy.deepcopy(page)
    for token in out["tokens"]:
        if "l" in token:
            token["l"] = mapping[token["l"]]
    out["lex"] = {str(mapping[int(key)]): entry for key, entry in page["lex"].items()}
    return out


def lexicon_row(entry: dict) -> dict:
    """Entrada del registro del pipeline → fila de `public.lexicon`."""
    return {
        "lemma": entry["lemma"],
        "pos": entry["pos"],
        "genders": list(entry.get("g", [])),
        "plural": entry.get("pl"),
        "senses": entry["senses"],
        "source": "wiktionary",
    }
