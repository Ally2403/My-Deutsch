from spike.metrics import char_class_accuracy, word_accuracy


def test_perfect_match():
    assert word_accuracy("Der Hund läuft.", "Der Hund läuft.") == 1.0


def test_one_substitution_of_four():
    assert word_accuracy("ein zwei drei vier", "ein zwel drei vier") == 0.75


def test_insertions_and_deletions_count_against():
    assert word_accuracy("a b c d", "a c d x") == 0.75


def test_punctuation_and_quotes_ignored():
    assert word_accuracy("„Ja, wirklich?“", '"Ja wirklich?"') == 1.0


def test_umlaut_accuracy():
    assert char_class_accuracy("Füße schön", "Fiiße schön", "äöüÄÖÜß") == 2 / 3
