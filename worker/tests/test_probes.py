import pytest

from lexicon.probes import clean_output, english_probe, german_probe


@pytest.mark.parametrize(
    ("lemma", "pos", "genders", "expected"),
    [
        ("Hilfe", "noun", ["f"], "die Hilfe"),
        ("Schatz", "noun", ["m"], "der Schatz"),
        ("Haus", "noun", ["n"], "das Haus"),
        ("Leute", "noun", [], "Leute"),
        ("aufstehen", "verb", [], "Ich möchte aufstehen."),
        ("schön", "adj", [], "schön"),
    ],
)
def test_german_probe_gives_grammatical_context(lemma, pos, genders, expected):
    assert german_probe(lemma, pos, genders) == expected


@pytest.mark.parametrize(
    ("gloss", "pos", "expected"),
    [
        ("to get up", "verb", "I want to get up."),
        ("start", "verb", "I want to start."),
        ("house", "noun", "house"),
    ],
)
def test_english_probe(gloss, pos, expected):
    assert english_probe(gloss, pos) == expected


@pytest.mark.parametrize(
    ("text", "pos", "source", "expected"),
    [
        ("la ayuda", "noun", "Hilfe", "ayuda"),
        ("Ayuda", "noun", "Hilfe", "ayuda"),
        ("la asistencia:", "noun", "Hilfe", "asistencia"),
        ("Cariño.", "noun", "Schatz", "cariño"),
        ("Quiero levantarme.", "verb", "aufstehen", "levantarse"),
        ("Quiero irme.", "verb", "gehen", "irse"),
        ("Quiero comprenderlo.", "verb", "verstehen", "comprender"),
        ("Quiero tener esperanza.", "verb", "hoffen", "tener esperanza"),
        ("Quiero ser yo.", "verb", "sein", "ser"),
        ("Quiero conseguir algo.", "verb", "verschaffen", "conseguir"),
        ("Quiero ir tras él.", "verb", "verfolgen", "ir tras"),
        ("Quiero dar a conocer.", "verb", "nennen", "dar a conocer"),
        ("Sin embargo,", "adv", "trotzdem", "sin embargo"),
        ("hermosa", "adj", "schön", "hermosa"),
    ],
)
def test_clean_output_normalizes(text, pos, source, expected):
    assert clean_output(text, pos, source) == expected


@pytest.mark.parametrize(
    ("text", "pos", "source"),
    [
        ("Espero que sí.", "verb", "hoffen"),  # no es un infinitivo
        ("Levántate", "verb", "aufstehen"),  # imperativo
        ("Haus", "noun", "Haus"),  # el modelo no tradujo
        ("  ", "adj", "x"),
        ("", "noun", "x"),
    ],
)
def test_clean_output_discards_what_is_not_usable(text, pos, source):
    assert clean_output(text, pos, source) is None


def test_a_noun_keeps_words_that_only_look_like_clitics():
    # «caballo» termina en «lo» pero no es un infinitivo: solo los verbos se tocan
    assert clean_output("el caballo", "noun", "Pferd") == "caballo"


def test_output_without_letters_is_discarded():
    assert clean_output("•", "pron", "dieser") is None
    assert clean_output("...", "adv", "x") is None
