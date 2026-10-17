from spike.hyphen import join_hyphenated


def test_joins_word_broken_at_line_end():
    lines = [["aber", "Normalerwei-"], ["se", "fand", "er"]]
    out = join_hyphenated(lines, known=set())
    assert [t.text for t in out] == ["aber", "Normalerweise", "fand", "er"]
    assert out[1].parts == [(0, 1), (1, 0)]


def test_keeps_hyphen_when_joined_form_unknown_and_hyphenated_known():
    lines = [["eine", "E-"], ["Mail"]]
    out = join_hyphenated(lines, known={"e-mail"})
    assert out[1].text == "E-Mail"


def test_inner_hyphen_untouched_and_dash_not_joined():
    lines = [["Ost-West", "–"], ["Konflikt"]]
    out = join_hyphenated(lines, known=set())
    assert [t.text for t in out] == ["Ost-West", "–", "Konflikt"]


def test_suspended_compound_before_conjunction_not_joined():
    # "Geräte- und Konditionsraum" (Ergänzungsstrich)
    lines = [["Geräte-"], ["und", "Konditionsraum"]]
    out = join_hyphenated(lines, known=set())
    assert [t.text for t in out] == ["Geräte-", "und", "Konditionsraum"]


def test_uppercase_continuation_keeps_hyphen():
    lines = [["Ost-"], ["West-Konflikt"]]
    out = join_hyphenated(lines, known=set())
    assert [t.text for t in out] == ["Ost-West-Konflikt"]
