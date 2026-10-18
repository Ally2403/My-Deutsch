from pathlib import Path

import pytest

from lexicon.build import build_lexicon
from lexicon.store import Lexicon

FIXTURE = Path(__file__).parent / "fixtures" / "kaikki_mini.jsonl"


@pytest.fixture(scope="module")
def lex(tmp_path_factory) -> Lexicon:
    out = tmp_path_factory.mktemp("lex") / "lexicon.sqlite"
    build_lexicon(FIXTURE, out)
    return Lexicon(out)


def test_noun_has_gender_plural_and_glosses(lex):
    e = lex.entry("Haus", "noun")
    assert e.genders == ["n"]
    assert e.plural == "Häuser"
    assert e.glosses_en == ["house", "building"]


def test_form_of_entry_points_to_its_lemma_and_has_no_entry_of_its_own(lex):
    assert lex.lookup_form("Häuser") == {("Haus", "noun")}
    assert lex.entry("Häuser", "noun") is None
    assert not lex.is_lemma("Häuser")


def test_plural_only_noun_has_no_gender_and_no_plural(lex):
    e = lex.entry("Leute", "noun")
    assert e.genders == []
    assert e.plural is None


def test_two_entries_of_the_same_noun_merge_genders_in_file_order(lex):
    e = lex.entry("Teil", "noun")
    assert e.genders == ["m", "n"]
    assert e.glosses_en == ["part", "part, piece"]


def test_proper_noun_is_mapped_to_propn_without_gender(lex):
    e = lex.entry("Berlin", "propn")
    assert e is not None and e.genders == []
    assert ("Haus", "propn") in lex.lookup_form("Haus")
    assert ("Haus", "noun") in lex.lookup_form("Haus")


def test_spanish_translations_from_wiktionary_are_kept(lex):
    assert lex.entry("Tisch", "noun").glosses_es == ["mesa"]
    assert lex.entry("Haus", "noun").glosses_es == []


def test_verb_forms_resolve_to_the_lemma_but_auxiliary_tags_do_not(lex):
    assert lex.lookup_form("ging") == {("gehen", "verb")}
    assert lex.lookup_form("gegangen") == {("gehen", "verb")}
    assert lex.lookup_form("strong") == set()
    assert lex.lookup_form("Hauses") == {("Haus", "noun")}


def test_alt_of_entries_are_excluded(lex):
    assert lex.lookup_form("Schloß") == set()
    assert not lex.is_lemma("Schloß")


def test_at_most_five_glosses(lex):
    assert len(lex.entry("Ding", "noun").glosses_en) == 5


def test_is_lemma_distinguishes_lemmas_from_forms(lex):
    assert lex.is_lemma("Haus") and lex.is_lemma("gehen")
    assert not lex.is_lemma("ging")


def test_unknown_form_and_entry(lex):
    assert lex.lookup_form("Xyzzy") == set()
    assert lex.entry("Xyzzy", "noun") is None
