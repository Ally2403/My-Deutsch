import copy

import pytest

from pipeline.page_json import validate_page
from publish.remap import lexicon_row, remap_page


def _page() -> dict:
    return {
        "v": 1,
        "size": [100, 200],
        "lines": [[0, 1]],
        "paragraphs": [[0, 1]],
        "images": [],
        "fields": [],
        "tokens": [
            {"t": "Haus", "b": [0, 0, 0.5, 0.1], "l": 1, "c": 0.9},
            {"t": "und", "b": [0.5, 0, 0.9, 0.1], "l": 2, "c": 0.9},
            {"t": "xyz", "b": [0, 0.2, 0.2, 0.3], "c": 0.5},
        ],
        "lex": {
            "1": {
                "lemma": "Haus",
                "pos": "noun",
                "g": ["n"],
                "senses": [{"es": "casa", "m": True}],
            },
            "2": {"lemma": "und", "pos": "conj", "senses": []},
        },
    }


def test_remap_rewrites_token_ids_and_lex_keys():
    out = remap_page(_page(), {1: 501, 2: 77})
    assert [t.get("l") for t in out["tokens"]] == [501, 77, None]
    assert set(out["lex"]) == {"501", "77"}
    assert out["lex"]["501"]["lemma"] == "Haus"


def test_remap_does_not_mutate_input():
    page = _page()
    before = copy.deepcopy(page)
    remap_page(page, {1: 501, 2: 77})
    assert page == before


def test_remap_missing_id_raises_keyerror():
    with pytest.raises(KeyError):
        remap_page(_page(), {1: 501})


def test_remap_result_still_validates():
    validate_page(remap_page(_page(), {1: 501, 2: 77}))


def test_lexicon_row_defaults():
    row = lexicon_row({"lemma": "und", "pos": "conj", "senses": []})
    assert row == {
        "lemma": "und",
        "pos": "conj",
        "genders": [],
        "plural": None,
        "senses": [],
        "source": "wiktionary",
    }


def test_lexicon_row_keeps_unicode_lemma():
    row = lexicon_row({"lemma": "Äpfel'ß", "pos": "noun", "g": ["m"], "pl": "Äpfel", "senses": []})
    assert row["lemma"] == "Äpfel'ß"
    assert row["genders"] == ["m"]
    assert row["plural"] == "Äpfel"
