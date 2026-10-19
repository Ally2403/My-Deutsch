from lexicon.glosses import clean_glosses


def test_definition_formulas_are_dropped_and_synonyms_kept():
    out = clean_glosses(["the act of helping, assistance", "a thing or person that helps"])
    assert out == ["assistance"]


def test_splits_on_semicolons_and_keeps_the_leading_to():
    assert clean_glosses(["to begin; to commence", "to start"]) == [
        "to begin",
        "to commence",
        "to start",
    ]


def test_parentheses_are_removed_and_commas_split():
    assert clean_glosses(["house, building", "home (in various phrases)"]) == [
        "house",
        "building",
        "home",
    ]


def test_a_gloss_that_is_only_a_parenthesis_disappears():
    assert clean_glosses(["(in various phrases)"]) == []


def test_square_brackets_are_removed():
    assert clean_glosses(["sit well with [with dative ‘someone’]"]) == ["sit well with"]


def test_clipping_note_is_removed():
    assert clean_glosses(["time of day (clipping of Uhrzeit)"]) == ["time of day"]


def test_duplicates_are_removed_ignoring_case():
    assert clean_glosses(["a", "A"]) == ["a"]


def test_very_long_fragments_are_dropped():
    assert clean_glosses(["x" * 41]) == []


def test_nested_parentheses_are_removed_completely():
    assert clean_glosses(["to say (verbally (aloud) or in writing)"]) == ["to say"]


def test_stray_brackets_and_quotes_never_survive():
    out = clean_glosses(["to hear a sound)", "to ask ”)", "(first-person) I"])
    assert out == ["to hear a sound", "to ask", "I"]
    assert not any(c in fragment for fragment in out for c in '()[]“”"')


def test_a_formula_in_the_middle_of_a_fragment_is_dropped_too():
    assert clean_glosses(["experience or the act of playing", "game"]) == ["game"]
