import json
from pathlib import Path

import pytest

from lexicon.build import build_lexicon
from lexicon.resolve import compound_entry, resolve
from lexicon.store import Lexicon


def _e(word, pos, forms=(), senses=None):
    return {
        "word": word,
        "pos": pos,
        "senses": senses or [{"glosses": ["x"]}],
        "forms": [{"form": f, "tags": t} for f, t in forms],
    }


ENTRIES = [
    _e("wissen", "verb", [("wusste", ["past"])]),
    _e("gehören", "verb", [("gehört", ["participle", "past"])]),
    _e("hören", "verb", [("gehört", ["participle", "past"])]),
    _e("schließen", "verb", [("schloss", ["past"])]),
    _e("Schloss", "noun", [("Schlössern", ["dative", "plural"])]),
    _e("Schloß", "noun", [("Schlössern", ["dative", "plural"])], [{"tags": ["alt-of"]}]),
    _e("der", "article", [("die", ["nominative", "feminine"])]),
    _e("Fahrrad", "noun", [("Fahrrädern", ["dative", "plural"])]),
    _e("murmeln", "verb"),
    _e("Schatz", "noun", [("Schätze", ["plural"])], [{"glosses": ["x"], "tags": ["masculine"]}]),
    _e("Gerät", "noun", [("Geräte", ["plural"])]),
    _e("Habe", "noun"),
    _e("haben", "verb", [("habe", ["present"])]),
    _e("abstimmen", "verb", [("abgestimmt", ["participle", "past"])]),
    _e("halblang", "adj"),
    _e("stänkern", "verb"),
    _e("Haus", "noun", [("Häuser", ["plural"])]),
    _e("gehen", "verb", [("ging", ["past"])]),
]


@pytest.fixture(scope="module")
def lex(tmp_path_factory) -> Lexicon:
    d = tmp_path_factory.mktemp("resolve")
    dump = d / "mini.jsonl"
    dump.write_text("\n".join(json.dumps(e, ensure_ascii=False) for e in ENTRIES), encoding="utf-8")
    build_lexicon(Path(dump), d / "lexicon.sqlite")
    return Lexicon(d / "lexicon.sqlite")


def lemma(text, pos, spacy_lemma, lex):
    return resolve(text, pos, spacy_lemma, lex)[0]


def test_returns_lemma_and_type(lex):
    assert resolve("Häuser", "NOUN", "Haus", lex) == ("Haus", "noun")
    assert resolve("ging", "VERB", "gehen", lex) == ("gehen", "verb")


def test_irregular_form_resolved_from_table(lex):
    assert lemma("wusste", "VERB", "wussen", lex) == "wissen"


def test_ambiguous_form_prefers_spacy_lemma_when_listed(lex):
    assert lemma("gehört", "VERB", "gehören", lex) == "gehören"


def test_case_matters_for_noun_vs_verb(lex):
    assert lemma("schloss", "VERB", "schloss", lex) == "schließen"
    assert lemma("Schloss", "NOUN", "Schloss", lex) == "Schloss"


def test_sentence_initial_capital_falls_back_to_lowercase_form(lex):
    assert lemma("Wusste", "VERB", "Wusste", lex) == "wissen"


def test_unknown_form_uses_spacy_lemma_only_if_it_exists(lex):
    assert resolve("murmelte", "VERB", "murmeln", lex) == ("murmeln", "verb")
    assert resolve("murmelte", "VERB", "murmelen", lex) == ("murmelte", None)


def test_compound_resolved_by_its_head(lex):
    assert resolve("Kunstschätze", "NOUN", "Kunstschätze", lex) == ("Kunstschatz", "noun")
    assert lemma("Fitnessgeräte", "NOUN", "Fitnessgeräte", lex) == "Fitnessgerät"


def test_declined_adjective_stripped_to_known_lemma(lex):
    assert lemma("abgestimmter", "ADJ", "abgestimmter", lex) == "abgestimmt"
    assert resolve("halblange", "ADV", "halblange", lex) == ("halblang", "adj")


def test_capitalized_verb_prefers_lowercase_reading_matching_pos(lex):
    assert lemma("Habe", "AUX", "Habe", lex) == "haben"


def test_zu_infinitive(lex):
    assert lemma("herumzustänkern", "VERB", "herumzustänkern", lex) == "herumstänkern"


def test_alternative_spellings_are_not_indexed(lex):
    assert lemma("Schlössern", "NOUN", "Schlöss", lex) == "Schloss"


def test_pos_of_lists_every_type_of_a_lemma(lex):
    assert lex.pos_of("Haus") == ["noun"]
    assert lex.pos_of("Xyzzy") == []


def test_compound_entry_takes_gender_and_plural_from_its_head(lex):
    e = compound_entry("Kunstschatz", lex)
    assert (e.lemma, e.pos, e.genders, e.plural) == ("Kunstschatz", "noun", ["m"], "Kunstschätze")
    assert e.glosses_en == [] and e.glosses_es == []


def test_compound_entry_is_none_for_real_lemmas_and_unknown_words(lex):
    assert compound_entry("Haus", lex) is None
    assert compound_entry("Schatz", lex) is None
    assert compound_entry("Xyzzy", lex) is None
