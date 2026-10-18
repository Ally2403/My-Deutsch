from pipeline.geometry import Word, build_tokens, words_from_rows


def row(text, left, top, width, height, conf="90", block="1", par="1", line="1"):
    return {
        "text": text,
        "left": str(left),
        "top": str(top),
        "width": str(width),
        "height": str(height),
        "conf": conf,
        "block_num": block,
        "par_num": par,
        "line_num": line,
    }


def test_converts_pixels_to_relative_boxes_with_four_decimals():
    [w] = words_from_rows([row("Haus", 100, 200, 50, 20)], width=1000, height=2000)
    assert w.text == "Haus"
    assert w.box == (0.1, 0.1, 0.05, 0.01)
    assert w.conf == 90.0


def test_boxes_are_clipped_to_the_page():
    [w] = words_from_rows([row("x", 990, 1990, 30, 30)], width=1000, height=2000)
    x, y, bw, bh = w.box
    assert x + bw <= 1.0 and y + bh <= 1.0
    [neg] = words_from_rows([row("x", -5, 10, 20, 10)], width=1000, height=2000)
    assert neg.box[0] == 0.0


def test_lines_and_paragraphs_are_numbered_densely_in_reading_order():
    rows = [
        row("a", 0, 0, 10, 10, block="2", par="1", line="3"),
        row("b", 0, 20, 10, 10, block="2", par="1", line="4"),
        row("c", 0, 40, 10, 10, block="5", par="2", line="1"),
    ]
    words = words_from_rows(rows, width=100, height=100)
    assert [(w.line, w.par) for w in words] == [(0, 0), (1, 0), (2, 1)]


def test_empty_text_rows_are_ignored():
    assert words_from_rows([row("  ", 0, 0, 10, 10)], width=100, height=100) == []


def _w(text, x, y, line, par=0, conf=90.0):
    return Word(text, (x, y, 0.05, 0.01), conf, line, par)


def test_hyphenated_word_is_joined_with_the_second_box():
    words = [
        _w("Das", 0.1, 0.1, 0),
        _w("Substan-", 0.3, 0.1, 0),
        _w("tiv", 0.1, 0.12, 1),
        _w("ist", 0.2, 0.12, 1),
    ]
    tokens = build_tokens(words, known=lambda w: False)
    assert [t.text for t in tokens] == ["Das", "Substantiv", "ist"]
    joined = tokens[1]
    assert joined.box == (0.3, 0.1, 0.05, 0.01)
    assert joined.box2 == (0.1, 0.12, 0.05, 0.01)
    assert joined.line == 0
    assert tokens[0].box2 is None


def test_hyphen_at_the_end_of_the_last_line_is_kept_as_is():
    words = [_w("Das", 0.1, 0.1, 0), _w("Substan-", 0.3, 0.1, 0)]
    tokens = build_tokens(words, known=lambda w: False)
    assert [t.text for t in tokens] == ["Das", "Substan-"]
    assert tokens[1].box2 is None


def test_confidence_of_a_joined_token_is_the_lowest_of_its_parts():
    words = [_w("Substan-", 0.3, 0.1, 0, conf=95.0), _w("tiv", 0.1, 0.12, 1, conf=60.0)]
    assert build_tokens(words, known=lambda w: False)[0].conf == 60.0


def test_no_words_gives_no_tokens():
    assert build_tokens([], known=lambda w: False) == []
