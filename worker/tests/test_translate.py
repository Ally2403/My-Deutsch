from lexicon.store import Entry
from lexicon.translate import NullTranslator, senses_for


class Fake:
    """Traductor con una tabla por idioma; lo que no está en la tabla devuelve vacío."""

    def __init__(self, german: dict[str, str] | None = None, english: dict[str, str] | None = None):
        self.german = german or {}
        self.english = english or {}
        self.calls: list[str] = []

    def from_german(self, text: str) -> str:
        self.calls.append(text)
        return self.german.get(text, "")

    def from_english(self, text: str) -> str:
        self.calls.append(text)
        return self.english.get(text, "")


def entry(lemma="Hilfe", pos="noun", genders=("f",), en=(), es=()) -> Entry:
    return Entry(lemma, pos, list(genders), None, list(en), list(es))


def spanish(senses: list[dict]) -> list[str]:
    return [s["es"] for s in senses]


def test_the_main_sense_comes_from_the_german_word_and_definitions_are_cleaned():
    out = senses_for(
        entry(en=["the act of helping, assistance", "a thing or person that helps"]),
        Fake(german={"die Hilfe": "la ayuda"}, english={"assistance": "Asistencia"}),
    )
    assert out == [{"es": "ayuda", "m": True}, {"es": "asistencia", "m": True}]


def test_wiktionary_spanish_goes_first_and_is_not_marked_as_machine():
    out = senses_for(
        entry(en=["help"], es=["socorro"]),
        Fake(german={"die Hilfe": "la ayuda"}, english={"help": "ayuda"}),
    )
    assert out == [{"es": "socorro", "m": False}, {"es": "ayuda", "m": True}]


def test_verbs_use_a_carrier_sentence_in_both_languages():
    out = senses_for(
        entry("anfangen", "verb", (), en=["to begin"]),
        Fake(
            german={"Ich möchte anfangen.": "Quiero empezar."},
            english={"I want to begin.": "Quiero comenzar."},
        ),
    )
    assert out == [{"es": "empezar", "m": True}, {"es": "comenzar", "m": True}]


def test_an_unusable_main_translation_is_discarded_but_definitions_remain():
    out = senses_for(
        entry("hoffen", "verb", (), en=["hope"]),
        Fake(
            german={"Ich möchte hoffen.": "Espero que sí."},
            english={"I want to hope.": "Quiero esperar."},
        ),
    )
    assert spanish(out) == ["esperar"]


def test_a_definition_that_is_only_a_formula_is_never_translated():
    t = Fake(german={"die Hilfe": "la ayuda"})
    out = senses_for(entry(en=["a thing or person that helps", "(in various phrases)"]), t)
    assert spanish(out) == ["ayuda"]
    assert t.calls == ["die Hilfe"]


def test_duplicates_are_removed_ignoring_case():
    out = senses_for(
        entry(en=["help"]),
        Fake(german={"die Hilfe": "la ayuda"}, english={"help": "Ayuda"}),
    )
    assert spanish(out) == ["ayuda"]


def test_never_more_than_five():
    en = [f"g{i}" for i in range(9)]
    out = senses_for(
        entry(en=en),
        Fake(german={"die Hilfe": "ayuda"}, english={f"g{i}": f"s{i}" for i in range(9)}),
    )
    assert len(out) == 5


def test_a_failing_main_translation_does_not_stop_the_definitions():
    class BrokenGerman(Fake):
        def from_german(self, text: str) -> str:
            raise RuntimeError("modelo no disponible")

    out = senses_for(entry(en=["help"]), BrokenGerman(english={"help": "ayuda"}))
    assert spanish(out) == ["ayuda"]


def test_a_translator_that_always_fails_leaves_only_wiktionary_spanish():
    class Boom:
        def from_german(self, text: str) -> str:
            raise RuntimeError("x")

        from_english = from_german

    assert senses_for(entry(en=["help"], es=["socorro"]), Boom()) == [{"es": "socorro", "m": False}]


def test_a_compound_without_definitions_still_gets_its_main_sense():
    out = senses_for(
        entry("Kunstschatz", "noun", ("m",), en=[]),
        Fake(german={"der Kunstschatz": "el tesoro artístico"}),
    )
    assert out == [{"es": "tesoro artístico", "m": True}]


def test_a_translation_equal_to_the_german_word_is_discarded():
    out = senses_for(entry("Haus", "noun", ("n",)), Fake(german={"das Haus": "Haus"}))
    assert out == []


def test_null_translator_leaves_only_wiktionary_spanish():
    out = senses_for(entry(en=["help"], es=["socorro"]), NullTranslator())
    assert out == [{"es": "socorro", "m": False}]


def test_particles_and_interjections_skip_the_bare_german_translation():
    # «ei» suelto sale «huevo»: solo se usan sus definiciones
    for pos in ("part", "intj"):
        t = Fake(german={"ei": "huevo"}, english={"hey": "oye"})
        out = senses_for(entry("ei", pos, (), en=["hey"]), t)
        assert spanish(out) == ["oye"], pos
        assert "ei" not in t.calls


def test_pronouns_and_determiners_are_translated_capitalized_like_a_sentence_start():
    # en minúscula «ich» sale «na»; como inicio de oración sale «yo»
    for pos in ("pron", "det"):
        out = senses_for(
            entry("ich", pos, (), en=["I"]), Fake(german={"Ich": "Yo"}, english={"I": "I"})
        )
        assert spanish(out) == ["yo"], pos


def test_prepositions_and_conjunctions_still_get_the_main_sense():
    out = senses_for(entry("mit", "prep", (), en=["with"]), Fake(german={"mit": "con"}))
    assert spanish(out) == ["con"]
