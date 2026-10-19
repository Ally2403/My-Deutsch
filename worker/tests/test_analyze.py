import json
from pathlib import Path

import pytest

from lexicon.build import build_lexicon
from lexicon.store import Lexicon
from pipeline.analyze import analyze, form_tag, trailing_particle_pairs
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
    _e("aufstehen", "verb", [("steht auf", ["present"])]),
    _e("stehen", "verb", [("steht", ["present"])]),
    _e("anfangen", "verb", [("fängt an", ["present"])]),
    _e("fangen", "verb", [("fängt", ["present"])]),
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


def test_form_tag_uses_the_wiktionary_plural_when_spacy_misses_the_number():
    assert form_tag({}, "noun", "Frauen", "Frau", plural="Frauen") == "pl"
    assert form_tag({"Number": "Sing"}, "noun", "Frauen", "Frau", plural="Frauen") == "pl"
    assert form_tag({}, "noun", "Frau", "Frau", plural="Frauen") is None
    assert form_tag({}, "noun", "Hauses", "Haus", plural="Häuser") is None
    assert form_tag({}, "verb", "Frauen", "frauen", plural="Frauen") is None


class FakeLex:
    """Solo responde a pos_of: los compuestos que existen como verbo."""

    def __init__(self, *verbs):
        self._verbs = set(verbs)

    def pos_of(self, lemma):
        return ["verb"] if lemma in self._verbs else []


def pairs(raws, lemmas, finite, lex, starts=None):
    cores = [r.strip(".,!?") for r in raws]
    starts = starts or {0}
    return trailing_particle_pairs(
        raws, cores, lemmas, finite, [i in starts for i in range(len(raws))], lex
    )


def test_trailing_particle_links_to_the_finite_verb():
    raws = ["Er", "steht", "um", "sieben", "Uhr", "auf."]
    lemmas = [None, "stehen", None, None, None, None]
    finite = [False, True, False, False, False, False]
    assert pairs(raws, lemmas, finite, FakeLex("aufstehen")) == [(1, 5, "aufstehen")]


def test_particle_in_the_middle_of_the_clause_is_not_linked():
    raws = ["Er", "steht", "auf", "dem", "Stuhl."]
    lemmas = [None, "stehen", None, None, None]
    finite = [False, True, False, False, False]
    assert pairs(raws, lemmas, finite, FakeLex("aufstehen")) == []


def test_no_pair_when_the_compound_is_not_in_the_lexicon():
    raws = ["Er", "steht", "heute", "auf."]
    lemmas = [None, "stehen", None, None]
    finite = [False, True, False, False]
    assert pairs(raws, lemmas, finite, FakeLex()) == []


def test_particle_does_not_cross_a_comma_or_a_sentence_start():
    lex = FakeLex("aufstehen")
    raws = ["Er", "steht,", "wenn", "es", "geht", "auf."]
    lemmas = [None, "stehen", None, None, "gehen", None]
    finite = [False, True, False, False, True, False]
    assert pairs(raws, lemmas, finite, lex) == []
    raws = ["Er", "steht.", "Sie", "ruft", "auf."]
    lemmas = [None, "stehen", None, "rufen", None]
    finite = [False, True, False, True, False]
    assert pairs(raws, lemmas, finite, lex, starts={0, 2}) == []


def test_infinitive_or_participle_is_not_a_finite_verb():
    raws = ["Er", "will", "früh", "aufstehen."]
    assert pairs(raws, [None, "wollen", None, None], [False, True, False, False], FakeLex()) == []
    raws = ["Er", "ist", "früh", "auf."]
    lemmas = [None, "sein", None, None]
    assert pairs(raws, lemmas, [False, True, False, False], FakeLex("aufsein")) == [
        (1, 3, "aufsein")
    ]


@pytest.mark.slow
def test_separable_verb_without_svp_is_linked_by_the_fallback_rule(nlp, lex):
    out = analyze(tokens("Er", "fängt", "morgen", "um", "acht", "Uhr", "an."), nlp, lex)
    assert out[1].sep == 6 and out[6].sep == 1
    assert out[1].lemma == "anfangen" and out[6].lemma == "anfangen"


@pytest.mark.slow
def test_separable_detection_rate_on_the_sentence_set():
    """RF-24, criterio 2: ≥ 80 % de los verbos separables con partícula separada se detectan.
    Usa el léxico real si existe (worker/.local/lexicon.sqlite); si no, se omite."""
    import spacy

    path = Path(__file__).parents[1] / ".local" / "lexicon.sqlite"
    if not path.exists():
        pytest.skip("falta el léxico real")
    real, model = Lexicon(path), spacy.load("de_core_news_md")
    rows = [
        line.split("\t")
        for line in (Path(__file__).parent / "fixtures" / "separable_sentences.tsv")
        .read_text(encoding="utf-8")
        .splitlines()
        if line and not line.startswith("#")
    ]
    hits, misses = 0, []
    for sentence, verb, particle, compound in rows:
        words = sentence.split()
        out = analyze(tokens(*words), model, real)
        v = next(i for i, w in enumerate(words) if w.strip(".,") == verb)
        p = next(i for i, w in enumerate(words) if w.strip(".,") == particle)
        ok = out[v].sep == p and out[p].sep == v and out[v].lemma == compound
        hits += ok
        if not ok:
            misses.append((sentence, out[v].lemma, out[p].lemma))
    rate = hits / len(rows)
    print(f"RF-24: {hits}/{len(rows)} = {rate:.0%}", misses)
    assert rate >= 0.8, f"{rate:.0%}: {misses}"
