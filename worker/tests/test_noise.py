from pipeline.geometry import Word
from pipeline.noise import drop_noise


def w(text, cx, conf=90.0):
    return Word(text, (cx - 0.02, 0.2, 0.04, 0.01), conf, 0, 0)


def test_removes_words_without_letters_or_digits():
    kept = drop_noise([w(".........", 0.5), w("=", 0.5), w("»", 0.5), w("Haus", 0.5)])
    assert [x.text for x in kept] == ["Haus"]


def test_removes_short_or_unsure_words_in_the_outer_margin():
    kept = drop_noise(
        [w("ı8", 0.02, conf=40.0), w("53", 0.97, conf=90.0), w("Üb", 0.03, conf=70.0)]
    )
    assert kept == []


def test_keeps_confident_long_words_at_the_edge():
    kept = drop_noise([w("Wohnung", 0.03, conf=90.0)])
    assert [x.text for x in kept] == ["Wohnung"]


def test_keeps_exercise_numbers_and_short_words_in_the_body():
    kept = drop_noise([w("3", 0.5), w("im", 0.5, conf=30.0), w("Haus", 0.5)])
    assert [x.text for x in kept] == ["3", "im", "Haus"]


def test_order_is_preserved():
    words = [w("b", 0.5), w("..", 0.5), w("a", 0.5)]
    assert [x.text for x in drop_noise(words)] == ["b", "a"]
