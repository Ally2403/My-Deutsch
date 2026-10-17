from spike.lexicon import FormIndex, resolve

INDEX = FormIndex(
    forms={
        "wusste": {("wissen", "verb")},
        "gehört": {("gehören", "verb"), ("hören", "verb")},
        "schloss": {("schließen", "verb")},
        "Schloss": {("Schloss", "noun")},
        "die": {("der", "article")},
        "Fahrrädern": {("Fahrrad", "noun")},
    },
    lemmas={"wissen", "gehören", "hören", "schließen", "Schloss", "der", "Fahrrad", "murmeln"},
)


def test_irregular_form_resolved_from_table():
    assert resolve("wusste", "VERB", "wussen", INDEX) == "wissen"


def test_ambiguous_form_prefers_spacy_lemma_when_listed():
    assert resolve("gehört", "VERB", "gehören", INDEX) == "gehören"


def test_case_matters_for_noun_vs_verb():
    assert resolve("schloss", "VERB", "schloss", INDEX) == "schließen"
    assert resolve("Schloss", "NOUN", "Schloss", INDEX) == "Schloss"


def test_sentence_initial_capital_falls_back_to_lowercase_form():
    assert resolve("Wusste", "VERB", "Wusste", INDEX) == "wissen"


def test_unknown_form_uses_spacy_lemma_only_if_it_exists():
    assert resolve("murmelte", "VERB", "murmeln", INDEX) == "murmeln"
    assert resolve("murmelte", "VERB", "murmelen", INDEX) == "murmelte"


INDEX2 = FormIndex(
    forms={
        "Schätze": {("Schatz", "noun")},
        "Geräte": {("Gerät", "noun")},
        "Habe": {("Habe", "noun")},
        "habe": {("haben", "verb")},
        "abgestimmt": {("abstimmen", "verb")},
    },
    lemmas={"Schatz", "Gerät", "Habe", "haben", "halblang", "stänkern"},
)


def test_compound_resolved_by_its_head():
    assert resolve("Kunstschätze", "NOUN", "Kunstschätze", INDEX2) == "Kunstschatz"
    assert resolve("Fitnessgeräte", "NOUN", "Fitnessgeräte", INDEX2) == "Fitnessgerät"


def test_declined_adjective_stripped_to_known_lemma():
    assert resolve("abgestimmter", "ADJ", "abgestimmter", INDEX2) == "abgestimmt"
    assert resolve("halblange", "ADV", "halblange", INDEX2) == "halblang"


def test_capitalized_verb_prefers_lowercase_reading_matching_pos():
    assert resolve("Habe", "AUX", "Habe", INDEX2) == "haben"


def test_zu_infinitive():
    assert resolve("herumzustänkern", "VERB", "herumzustänkern", INDEX2) == "herumstänkern"


def test_alternative_spellings_are_not_indexed(tmp_path):
    import gzip
    import json

    from spike.lexicon import FormIndex as FI

    entries = [
        {"word": "Schloss", "pos": "noun", "senses": [{}], "forms": [{"form": "Schlössern"}]},
        {"word": "Schloß", "pos": "noun", "senses": [{"tags": ["alt-of", "archaic"]}],
         "forms": [{"form": "Schlössern"}]},
    ]
    path = tmp_path / "de.jsonl.gz"
    with gzip.open(path, "wt", encoding="utf-8") as f:
        f.writelines(json.dumps(e) + "\n" for e in entries)
    index = FI.from_kaikki(path)
    assert resolve("Schlössern", "NOUN", "Schlöss", index) == "Schloss"
