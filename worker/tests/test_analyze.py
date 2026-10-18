import json
from pathlib import Path

import pytest

from lexicon.build import build_lexicon
from lexicon.store import Lexicon
from pipeline.analyze import analyze, form_tag
from pipeline.geometry import RawToken

B = (0.1, 0.1, 0.05, 0.01)


@pytest.mark.parametrize(
    ("morph", "pos", "text", "lemma", "expected"),
    [
        ({"Tense": "Past", "VerbForm": "Fin"}, "verb", "ging", "gehen", "pret"),
        ({"VerbForm": "Part", "Tense": "Past"}, "verb", "gegangen", "gehen", "part"),
        ({"Tense": "Pres", "VerbForm": "Fin"}, "verb", "geht", "gehen", "pres"),
        ({"Tense": "Pres", "VerbForm": "Fin"}, "verb", "gehen", "gehen", None),
        ({"Number": "Plur"}, "noun", "Häuser", "Haus", "pl"),
        ({"Number": "Plur"}, "noun", "Leute", "Leute", "pl"),
        ({"Number": "Plur"}, "noun", "Lehrer", "Lehrer", "pl"),
        ({"Number": "Sing"}, "noun", "Haus", "Haus", None),
        ({"Degree": "Cmp"}, "adj", "neuer", "neu", "comp"),
        ({"Degree": "Sup"}, "adj", "neueste", "neu", "sup"),
        ({"VerbForm": "Part"}, "adj", "abgestimmt", "abstimmen", "part"),
        ({}, "adv", "heute", "heute", None),
    ],
)
def test_form_tag(morph, pos, text, lemma, expected):
    assert form_tag(morph, pos, text, lemma) == expected


def _e(word, pos, forms=()):
    return {
        "word": word,
        "pos": pos,
        "senses": [{"glosses": ["x"]}],
        "forms": [{"form": f, "tags": t} for f, t in forms],
    }


ENTRIES = [
    _e("anrufen", "verb", [("ruft", ["present"]), ("rief", ["past"])]),
    _e("rufen", "verb", [("ruft", ["present"])]),
    _e("Haus", "noun", [("Häuser", ["plural"])]),
    _e("sein", "verb", [("sind", ["present"])]),
    _e("alt", "adj"),
]


@pytest.fixture(scope="module")
def lex(tmp_path_factory) -> Lexicon:
    d = tmp_path_factory.mktemp("analyze")
    dump = d / "mini.jsonl"
    dump.write_text("\n".join(json.dumps(e, ensure_ascii=False) for e in ENTRIES), encoding="utf-8")
    build_lexicon(Path(dump), d / "lexicon.sqlite")
    return Lexicon(d / "lexicon.sqlite")


@pytest.fixture(scope="module")
def nlp():
    import spacy

    return spacy.load("de_core_news_md")


def tokens(*texts):
    return [RawToken(t, B, None, 90.0, 0, 0) for t in texts]


@pytest.mark.slow
def test_separable_verb_pair_is_linked_both_ways(nlp, lex):
    toks = tokens("Er", "ruft", "sie", "morgen", "an.")
    out = analyze(toks, nlp, lex)
    assert out[1].sep == 4 and out[4].sep == 1
    assert out[1].lemma == "anrufen" and out[4].lemma == "anrufen"
    assert out[1].pos == "verb"


@pytest.mark.slow
def test_plural_noun_gets_lemma_type_and_form(nlp, lex):
    out = analyze(tokens("Die", "Häuser", "sind", "alt."), nlp, lex)
    assert (out[1].lemma, out[1].pos, out[1].form) == ("Haus", "noun", "pl")
    assert out[3].lemma == "alt"


@pytest.mark.slow
def test_attached_punctuation_does_not_change_the_lemma(nlp, lex):
    out = analyze(tokens("Das", "Haus."), nlp, lex)
    assert (out[1].lemma, out[1].pos) == ("Haus", "noun")


@pytest.mark.slow
def test_numbers_get_no_lemma_and_empty_input_is_fine(nlp, lex):
    out = analyze(tokens("Übung", "3"), nlp, lex)
    assert (out[1].lemma, out[1].pos, out[1].sep) == (None, None, None)
    assert analyze([], nlp, lex) == []
