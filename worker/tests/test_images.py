import numpy as np

from pipeline.images import detect_images

RNG = np.random.default_rng(7)


def page(h=1100, w=800):
    return np.full((h, w), 235, np.uint8)


def texture(img, y0, y1, x0, x1):
    img[y0:y1, x0:x1] = RNG.integers(40, 225, (y1 - y0, x1 - x0), dtype=np.uint8)


def test_a_textured_block_outside_the_text_is_an_illustration():
    img = page()
    texture(img, 400, 700, 150, 650)
    (b,) = detect_images(img, [])
    x, y, w, h = b
    assert abs(x - 150 / 800) < 0.05 and abs(y - 400 / 1100) < 0.05
    assert abs(w - 500 / 800) < 0.08 and abs(h - 300 / 1100) < 0.08


def test_ink_covered_by_ocr_words_is_text_not_an_illustration():
    img = page()
    texture(img, 400, 700, 150, 650)
    words = [(0.15, 0.35, 0.65, 0.3)]  # cubre todo el bloque
    assert detect_images(img, words) == []


def test_a_dark_flat_drawing_counts_but_a_lightly_tinted_box_does_not():
    img = page()
    img[200:400, 150:650] = 100  # dibujo de relleno plano oscuro
    img[600:800, 150:650] = 215  # recuadro de color suave (llamada de atención)
    assert len(detect_images(img, [])) == 1


def test_small_marks_are_ignored():
    img = page()
    texture(img, 800, 840, 100, 160)  # mancha pequeña
    assert detect_images(img, []) == []


def test_header_and_footer_art_is_ignored():
    img = page()
    texture(img, 0, 120, 100, 700)  # adorno de encabezado
    texture(img, 1070, 1100, 100, 700)
    assert detect_images(img, []) == []


def test_a_thin_rule_is_not_an_illustration():
    img = page()
    img[500:503, 100:700] = 20
    assert detect_images(img, []) == []


def test_two_separate_illustrations_give_two_boxes_in_reading_order():
    img = page()
    texture(img, 600, 900, 100, 400)
    texture(img, 200, 450, 300, 700)
    boxes = detect_images(img, [])
    assert len(boxes) == 2 and boxes[0][1] < boxes[1][1]


def test_a_band_that_bleeds_off_the_top_or_bottom_edge_is_page_decoration():
    img = page()
    img[0:230, :] = 100  # banda de color que llega más abajo del encabezado y toca el borde
    img[900:1100, :] = 100
    assert detect_images(img, []) == []
