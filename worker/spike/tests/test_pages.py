import numpy as np

from spike.pages import find_spine


def _page_with_text(w: int, h: int, x0: int, x1: int) -> np.ndarray:
    img = np.full((h, w), 255, np.uint8)
    for y in range(int(h * 0.15), int(h * 0.85), 20):
        img[y : y + 8, x0:x1] = 0
    return img


def test_spread_spine_is_center_of_gutter():
    w, h = 1000, 600
    left = _page_with_text(w, h, 60, 480)
    right = _page_with_text(w, h, 520, 940)
    spread = np.minimum(left, right)
    assert 495 <= find_spine(spread) <= 505


def test_single_page_has_no_spine():
    single = _page_with_text(600, 900, 60, 540)
    assert find_spine(single) is None


def test_infer_printed_numbers_from_majority_offset():
    from spike.pages import infer_printed_numbers

    candidates = [[4], [], [10, 6], [7, 7], [], [3], [], [11, 71], [12, 5], [13]]
    assert infer_printed_numbers(candidates) == list(range(4, 14))


def test_infer_printed_numbers_needs_two_agreeing_votes():
    from spike.pages import infer_printed_numbers

    assert infer_printed_numbers([[], []]) == [None, None]
    assert infer_printed_numbers([[9], [], [1]]) == [None, None, None]
