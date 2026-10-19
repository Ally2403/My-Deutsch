import json
from pathlib import Path

import numpy as np
import pytest

from lexicon.build import build_lexicon
from lexicon.store import Lexicon
from pipeline.analyze import Analyzed
from pipeline.geometry import RawToken
from pipeline.image import render_webp, webp_size
from pipeline.page_json import LexRegistry, build_page, validate_page


class FakeTranslator:
    def from_german(self, text: str) -> str:
        return f"es:{text}"

    from_english = from_german


def _e(word, pos, forms=(), senses=None, translations=None):
    e = {
        "word": word,
        "pos": pos,
        "senses": senses or [{"glosses": ["house"], "tags": ["neuter"]}],
        "forms": [{"form": f, "tags": t} for f, t in forms],
    }
    if translations:
        e["translations"] = translations
    return e


ENTRIES = [
    _e(
        "Haus", "noun", [("Häuser", ["plural"])], translations=[{"lang_code": "es", "word": "casa"}]
    ),
    _e(
        "Schatz",
        "noun",
        [("Schätze", ["plural"])],
        senses=[{"glosses": ["treasure"], "tags": ["masculine"]}],
    ),
    _e("Leute", "noun", senses=[{"glosses": ["people"], "tags": ["plural-only"]}]),
    _e("gehen", "verb", [("ging", ["past"])], senses=[{"glosses": [f"g{i}"]} for i in range(8)]),
]


@pytest.fixture(scope="module")
def lex(tmp_path_factory) -> Lexicon:
    d = tmp_path_factory.mktemp("page")
    dump = d / "mini.jsonl"
    dump.write_text("\n".join(json.dumps(e, ensure_ascii=False) for e in ENTRIES), encoding="utf-8")
    build_lexicon(Path(dump), d / "lexicon.sqlite")
    return Lexicon(d / "lexicon.sqlite")


def tok(text, line=0, par=0, x=0.1, conf=97.0, box2=None):
    return RawToken(text, (x, 0.1 + line * 0.02, 0.05, 0.01), box2, conf, line, par)


def page(tokens, analyzed, lex, registry=None):
    return build_page(
        (1600, 2263), tokens, analyzed, lex, FakeTranslator(), registry or LexRegistry()
    )


def test_known_word_gets_a_lexicon_entry_with_gender_plural_and_senses(lex):
    p = page([tok("Häuser")], [Analyzed("Haus", "noun", "pl", None)], lex)
    t = p["tokens"][0]
    assert t["t"] == "Häuser" and t["f"] == "pl" and t["c"] == 0.97
    assert p["lex"][str(t["l"])] == {
        "lemma": "Haus",
        "pos": "noun",
        "g": ["n"],
        "pl": "Häuser",
        "senses": [
            {"es": "casa", "m": False},
            {"es": "es:das Haus", "m": True},
            {"es": "es:house", "m": True},
        ],
    }
    validate_page(p)


def test_plural_only_noun_has_an_empty_gender_list(lex):
    p = page([tok("Leute")], [Analyzed("Leute", "noun", None, None)], lex)
    assert p["lex"][str(p["tokens"][0]["l"])]["g"] == []
    assert "pl" not in p["lex"][str(p["tokens"][0]["l"])]


class InfinitiveTranslator:
    """Devuelve infinitivos distintos (solo letras), como los que acepta la validación."""

    def __init__(self):
        self.n = 0

    def from_german(self, text: str) -> str:
        self.n += 1
        return "".join(chr(97 + int(d)) for d in str(self.n)) + "ar"

    from_english = from_german


def test_non_noun_has_no_gender_key_and_at_most_five_senses(lex):
    p = build_page(
        (1600, 2263),
        [tok("ging")],
        [Analyzed("gehen", "verb", "pret", None)],
        lex,
        InfinitiveTranslator(),
        LexRegistry(),
    )
    entry = p["lex"][str(p["tokens"][0]["l"])]
    assert "g" not in entry and len(entry["senses"]) == 5


def test_word_without_entry_has_no_lexicon_id(lex):
    p = page(
        [tok("Xyzzy"), tok("3")],
        [Analyzed("Xyzzy", None, None, None), Analyzed(None, None, None, None)],
        lex,
    )
    assert all("l" not in t for t in p["tokens"])
    assert p["lex"] == {}
    validate_page(p)


def test_lines_and_paragraphs_are_inclusive_index_ranges(lex):
    tokens = [tok("a", 0, 0), tok("b", 0, 0, x=0.2), tok("c", 1, 0), tok("d", 2, 1)]
    p = page(tokens, [Analyzed(None, None, None, None)] * 4, lex)
    assert p["lines"] == [[0, 1], [2, 2], [3, 3]]
    assert p["paragraphs"] == [[0, 2], [3, 3]]


def test_separable_pair_and_hyphenated_second_box_are_serialized(lex):
    tokens = [tok("ruft"), tok("Normalerweise", 1, box2=(0.1, 0.12, 0.03, 0.01)), tok("an.", x=0.5)]
    analyzed = [
        Analyzed(None, None, None, 2),
        Analyzed(None, None, None, None),
        Analyzed(None, None, None, 0),
    ]
    p = page(tokens, analyzed, lex)
    assert p["tokens"][0]["sep"] == 2 and p["tokens"][2]["sep"] == 0
    assert p["tokens"][1]["b2"] == [0.1, 0.12, 0.03, 0.01]
    validate_page(p)


def test_empty_page_is_valid(lex):
    p = page([], [], lex)
    assert p["tokens"] == [] and p["lines"] == [] and p["paragraphs"] == []
    assert p["v"] == 1 and p["size"] == [1600, 2263]
    validate_page(p)


def test_same_lemma_keeps_the_same_id_across_pages_and_roundtrips(lex):
    reg = LexRegistry()
    a = page([tok("Haus")], [Analyzed("Haus", "noun", None, None)], lex, reg)
    b = page([tok("Häuser")], [Analyzed("Haus", "noun", "pl", None)], lex, reg)
    assert a["tokens"][0]["l"] == b["tokens"][0]["l"]
    again = LexRegistry.from_dict(reg.to_dict())
    c = page([tok("Haus")], [Analyzed("Haus", "noun", None, None)], lex, again)
    assert c["tokens"][0]["l"] == a["tokens"][0]["l"]


def valid_page(lex):
    return page([tok("Haus")], [Analyzed("Haus", "noun", None, None)], lex)


@pytest.mark.parametrize(
    "mutate",
    [
        lambda p: p.update(v=2),
        lambda p: p["tokens"][0].update(b=[0.1, 0.1, 1.2, 0.02]),
        lambda p: p["tokens"][0].update(b=[-0.1, 0.1, 0.1, 0.02]),
        lambda p: p["tokens"][0].update(l=999),
        lambda p: p["lex"][str(p["tokens"][0]["l"])].update(senses=[{"es": "x", "m": False}] * 6),
        lambda p: p.update(lines=[[0, 5]]),
        lambda p: p["tokens"][0].update(sep=7),
        lambda p: p["tokens"][0].update(f="xyz"),
    ],
)
def test_validate_page_rejects_malformed_pages(lex, mutate):
    p = valid_page(lex)
    mutate(p)
    with pytest.raises(ValueError):
        validate_page(p)


def test_render_webp_is_1600_wide_and_within_the_size_limit():
    gray = np.full((3300, 2400), 250, np.uint8)
    gray[400:900, 300:2000] = 20
    data = render_webp(gray)
    assert data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    assert len(data) <= 250 * 1024
    assert webp_size(gray.shape) == (1600, 2200)


def test_render_webp_fails_clearly_instead_of_writing_an_oversized_image():
    noise = np.random.default_rng(0).integers(0, 255, (2263, 1600), dtype=np.uint8)
    with pytest.raises(ValueError, match="excede"):
        render_webp(noise, max_bytes=20_000)


def _mutate_ok(p):
    return p


@pytest.mark.parametrize(
    "mutate",
    [
        lambda p: p.update(v=True),
        lambda p: p["tokens"][0].update(b=[True, 0, 0, 0]),
        lambda p: p["tokens"][0].update(l="1"),
        lambda p: p["tokens"][0].update(l=True),
        lambda p: p.update(lines=[[True, 0]]),
        lambda p: p.update(lines=[[0.0, 0]]),
        lambda p: p.update(tokens="no es una lista"),
        lambda p: p.update(lines={"a": 1}),
        lambda p: p.update(lex=[]),
        lambda p: p["lex"].update({"1": "no es un diccionario"}),
        lambda p: p["lex"][str(p["tokens"][0]["l"])].update(senses=["x"]),
        lambda p: p.pop("lex"),
        lambda p: p.pop("tokens"),
        lambda p: p["tokens"][0].update(sep=True),
    ],
)
def test_validate_page_is_as_strict_as_the_typescript_parser(lex, mutate):
    p = valid_page(lex)
    mutate(p)
    with pytest.raises(ValueError):
        validate_page(p)


def test_validate_page_only_ever_raises_value_error():
    for junk in (
        None,
        5,
        "x",
        [],
        {"v": 1, "size": "x"},
        {"v": 1, "size": [1, 1], "tokens": [None]},
    ):
        with pytest.raises(ValueError):
            validate_page(junk)


def test_registry_allocates_ids_from_the_real_maximum(lex):
    reg = LexRegistry.from_dict(
        {
            "ids": {"Leute|noun": 5},
            "entries": {"5": {"lemma": "Leute", "pos": "noun", "senses": []}},
        }
    )
    p = page([tok("Haus")], [Analyzed("Haus", "noun", None, None)], lex, reg)
    assert p["tokens"][0]["l"] == 6


@pytest.mark.parametrize(
    "data",
    [
        {"ids": {"a|noun": 1, "b|noun": 1}, "entries": {"1": {}}},  # id repetido
        {"ids": {"a|noun": 1}, "entries": {"2": {}}},  # ids y entradas no coinciden
        {"ids": {"a|noun": 0}, "entries": {"0": {}}},  # ids positivos
    ],
)
def test_registry_rejects_inconsistent_saved_state(data):
    with pytest.raises(ValueError):
        LexRegistry.from_dict(data)


def test_webp_size_rejects_absurd_geometry_before_resizing():
    from pipeline.image import MAX_INPUT_PIXELS

    with pytest.raises(ValueError, match="proporción"):
        webp_size((10_000, 1_000))  # tira de 10:1
    with pytest.raises(ValueError, match="dimensiones"):
        webp_size((100, 0))
    with pytest.raises(ValueError, match="demasiado grande"):
        render_webp(np.zeros((MAX_INPUT_PIXELS // 1000 + 1, 1000), np.uint8))
    assert webp_size((2263, 1600)) == (1600, 2263)


def test_compound_without_its_own_entry_is_colored_by_its_head(lex):
    p = page([tok("Kunstschätze")], [Analyzed("Kunstschatz", "noun", "pl", None)], lex)
    entry = p["lex"][str(p["tokens"][0]["l"])]
    assert entry == {
        "lemma": "Kunstschatz",
        "pos": "noun",
        "g": ["m"],
        "pl": "Kunstschätze",
        "senses": [{"es": "es:der Kunstschatz", "m": True}],
    }
    validate_page(p)


def test_detected_fields_are_serialized_and_valid(lex):
    p = build_page(
        (1600, 2263),
        [tok("a")],
        [Analyzed(None, None, None, None)],
        lex,
        FakeTranslator(),
        LexRegistry(),
        [(0.1, 0.2, 0.3, 0.02)],
    )
    assert p["fields"] == [[0.1, 0.2, 0.3, 0.02]]
    validate_page(p)


def test_pages_without_fields_keep_an_empty_list(lex):
    assert page([tok("a")], [Analyzed(None, None, None, None)], lex)["fields"] == []
