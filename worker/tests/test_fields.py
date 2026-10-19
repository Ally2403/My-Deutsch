from pipeline.fields import detect_fields
from pipeline.geometry import Word


def w(text, x, y=0.3, width=0.12, h=0.012, line=0):
    return Word(text, (x, y, width, h), 90.0, line, 0)


def test_a_line_of_underscores_becomes_a_field_above_the_line():
    (f,) = detect_fields([w("________", 0.3)])
    x, y, fw, fh = f
    assert (x, fw) == (0.3, 0.12)
    assert fh >= 0.02  # alto suficiente para escribir
    assert y + fh <= 0.3 + 0.012 + 1e-9  # termina en la línea, no debajo


def test_dashes_count_only_when_long_and_dots_never_do():
    assert detect_fields([w("——————", 0.3)]) != []
    assert detect_fields([w("—", 0.3)]) == []
    assert detect_fields([w("..........", 0.3)]) == []  # puntos de índice, no de ejercicio


def test_ordinary_words_are_not_fields():
    assert detect_fields([w("Haus", 0.3), w("ist", 0.5)]) == []


def test_adjacent_blanks_on_one_line_merge_but_distinct_lines_do_not():
    merged = detect_fields([w("____", 0.30, width=0.05), w("____", 0.36, width=0.05)])
    assert len(merged) == 1
    assert merged[0][2] > 0.1
    apart = detect_fields([w("____", 0.3, line=0), w("____", 0.3, y=0.5, line=1)])
    assert len(apart) == 2


def test_a_word_glued_to_its_blank_only_gives_the_blank_part():
    # «der_____» : 3 letras + 5 guiones bajos → el campo es la parte derecha de la caja
    (f,) = detect_fields([w("der_____", 0.2, width=0.16)])
    assert f[0] > 0.2 + 0.16 * 3 / 8 - 1e-6
    assert abs((f[0] + f[2]) - 0.36) < 1e-3


def test_fields_come_in_reading_order_and_stay_inside_the_page():
    fs = detect_fields([w("____", 0.9, y=0.9, width=0.2, h=0.2), w("____", 0.1, y=0.2)])
    assert [round(f[1], 2) < 0.5 for f in fs] == [True, False]
    for x, y, fw, fh in fs:
        assert 0 <= x <= 1 and 0 <= y <= 1 and x + fw <= 1 + 1e-9 and y + fh <= 1 + 1e-9


# --- líneas de respuesta detectadas en la imagen (RF-34) ---------------------------------------
import numpy as np  # noqa: E402

from pipeline.fields import detect_lines, merge_fields  # noqa: E402


def blank_page(h=1000, w=800):
    return np.full((h, w), 235, np.uint8)  # papel claro


def test_a_thin_horizontal_rule_is_a_field_above_it():
    img = blank_page()
    img[500:503, 100:300] = 20
    (f,) = detect_lines(img)
    x, y, fw, fh = f
    assert abs(x - 100 / 800) < 0.005 and abs(fw - 200 / 800) < 0.01
    assert y + fh <= 503 / 1000 + 0.002 and fh >= 0.02


def test_short_marks_thick_bars_and_text_strokes_are_not_fields():
    img = blank_page()
    img[500:503, 100:130] = 20  # guion corto (3,75 % del ancho)
    img[100:140, 0:800] = 40  # banda de encabezado
    img[700:760, 100:300] = 20  # bloque macizo
    assert detect_lines(img) == []


def test_a_line_with_a_tiny_scanner_gap_stays_one_field():
    img = blank_page()
    img[300:303, 100:250] = 20
    img[300:303, 252:400] = 20  # hueco de 2 px
    assert len(detect_lines(img)) == 1


def test_a_slightly_tilted_rule_is_still_found():
    img = blank_page()
    for x in range(100, 400):
        y = 400 + (x - 100) // 100  # sube 3 px en 300
        img[y : y + 2, x] = 20
    assert len(detect_lines(img)) == 1


def test_merge_drops_a_detected_line_that_the_ocr_already_found():
    ocr = [(0.10, 0.50, 0.25, 0.02)]
    lines = [(0.11, 0.505, 0.24, 0.02), (0.1, 0.8, 0.3, 0.02)]
    assert merge_fields(ocr, lines) == [(0.10, 0.50, 0.25, 0.02), (0.1, 0.8, 0.3, 0.02)]


def test_marks_in_the_header_footer_and_page_edges_are_ignored():
    img = blank_page()
    img[30:33, 100:300] = 20  # encabezado (3 % del alto)
    img[975:978, 100:300] = 20  # pie
    img[500:503, 0:400] = 20  # toca el borde izquierdo: sombra del escáner
    img[600:603, 400:800] = 20  # toca el borde derecho
    img[700:703, 100:300] = 20  # esta sí es un hueco
    assert len(detect_lines(img)) == 1
