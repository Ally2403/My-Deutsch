import pytest

from lexicon.store import Entry
from lexicon.translate import ArgosTranslator, senses_for


class Fake:
    def __init__(self, table: dict[str, str] | None = None):
        self.table = table or {}
        self.calls: list[str] = []

    def translate(self, text: str) -> str:
        self.calls.append(text)
        return self.table.get(text, f"es:{text}")


def entry(en=(), es=()) -> Entry:
    return Entry("Haus", "noun", ["n"], "Häuser", list(en), list(es))


def test_uses_wiktionary_spanish_without_marking_it_as_machine():
    t = Fake()
    out = senses_for(entry(en=["house"], es=["casa", "hogar"]), t)
    assert out[:2] == [{"es": "casa", "m": False}, {"es": "hogar", "m": False}]
    assert out[2] == {"es": "es:house", "m": True}


def test_does_not_call_the_translator_when_spanish_is_enough():
    t = Fake()
    senses_for(entry(en=["a"], es=["1", "2", "3", "4", "5"]), t)
    assert t.calls == []


def test_machine_translations_are_marked():
    out = senses_for(
        entry(en=["house", "building"]), Fake({"house": "casa", "building": "edificio"})
    )
    assert out == [{"es": "casa", "m": True}, {"es": "edificio", "m": True}]


def test_duplicates_are_removed_ignoring_case():
    out = senses_for(
        entry(en=["house", "home"], es=["Casa"]), Fake({"house": "casa", "home": "hogar"})
    )
    assert [s["es"] for s in out] == ["Casa", "hogar"]


def test_never_more_than_five():
    out = senses_for(entry(en=[f"g{i}" for i in range(9)]), Fake())
    assert len(out) == 5


def test_empty_translation_is_skipped():
    out = senses_for(entry(en=["a", "b"]), Fake({"a": "  ", "b": "bé"}))
    assert out == [{"es": "bé", "m": True}]


def test_a_failing_translator_drops_the_sense_without_breaking():
    class Boom:
        def translate(self, text: str) -> str:
            raise RuntimeError("modelo no disponible")

    assert senses_for(entry(en=["house"], es=["casa"]), Boom()) == [{"es": "casa", "m": False}]


@pytest.mark.slow
def test_argos_translates_a_simple_word():
    assert "casa" in ArgosTranslator().translate("house").lower()
