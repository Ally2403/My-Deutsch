import copy

import pytest

from pipeline.page_json import validate_page
from upgrade.page import UpgradeError, upgrade_page


class Tr:
    def from_german_many(self, texts):
        return [f"es:{t}" for t in texts]


class Blank:
    def from_german_many(self, texts):
        return ["" for _ in texts]


def tok(text, x):
    return {"t": text, "b": [x, 0.1, 0.05, 0.02], "c": 0.9}


def page(**extra):
    words = ["Das", "ist", "gut.", "Wir", "gehen", "heim."]
    base = {
        "v": 1,
        "size": [100, 200],
        "lines": [[0, 5]],
        "paragraphs": [[0, 2], [3, 5]],
        "images": [],
        "fields": [],
        "tokens": [tok(w, 0.1 * i) for i, w in enumerate(words)],
        "lex": {},
    }
    base.update(extra)
    return base


def starts(tokens, nlp):
    return [t.text in ("Das", "Wir") for t in tokens]


def test_adds_valid_sents_and_keeps_everything_else():
    p = page()
    out = upgrade_page(p, None, Tr(), starts=starts)
    assert out["sents"] == [
        {"r": [0, 2], "es": "es:Das ist gut."},
        {"r": [3, 5], "es": "es:Wir gehen heim."},
    ]
    validate_page(out)
    assert {k: v for k, v in out.items() if k != "sents"} == p


def test_does_not_mutate_input():
    p = page()
    before = copy.deepcopy(p)
    upgrade_page(p, None, Tr(), starts=starts)
    assert p == before


def test_page_with_sents_is_skipped():
    assert upgrade_page(page(sents=[]), None, Tr(), starts=starts) is None


def test_paragraph_boundary_splits_even_without_spacy_start():
    out = upgrade_page(page(), None, Tr(), starts=lambda t, n: [False] * len(t))
    assert [s["r"] for s in out["sents"]] == [[0, 2], [3, 5]]


def test_page_without_letters_gets_empty_sents():
    p = page(tokens=[tok("12", 0.1)], lines=[[0, 0]], paragraphs=[[0, 0]])
    assert upgrade_page(p, None, Tr(), starts=starts)["sents"] == []


def test_failed_translation_raises_instead_of_marking_done():
    with pytest.raises(UpgradeError):
        upgrade_page(page(), None, Blank(), starts=starts)


def test_empty_page_gets_empty_sents():
    p = page(tokens=[], lines=[], paragraphs=[])
    assert upgrade_page(p, None, Tr(), starts=starts)["sents"] == []


def test_invalid_page_raises():
    p = page()
    p["tokens"][0]["b"] = [2, 2, 2, 2]
    with pytest.raises(UpgradeError):
        upgrade_page(p, None, Tr(), starts=starts)
