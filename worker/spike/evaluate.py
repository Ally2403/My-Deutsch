"""Compara el OCR con las transcripciones de referencia de data/gt/ (RNF-03, RF-39).

Uso: uv run python evaluate.py [--ocr ocr]
"""

import argparse
import json
from pathlib import Path

from spike.metrics import char_class_accuracy, word_accuracy

UMLAUTS = "äöüÄÖÜß"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ocr", default="ocr")
    args = ap.parse_args()
    data = Path("data")
    ref_all, hyp_all, rows = [], [], []
    for gt in sorted((data / "gt").glob("*.txt")):
        ref = gt.read_text(encoding="utf-8")
        hyp = (data / args.ocr / f"{gt.stem}.raw.txt").read_text(encoding="utf-8")
        ref_all.append(ref)
        hyp_all.append(hyp)
        rows.append(
            {
                "page": gt.stem,
                "words": word_accuracy(ref, hyp),
                "umlauts": char_class_accuracy(ref, hyp, UMLAUTS),
            }
        )
    ref, hyp = "\n".join(ref_all), "\n".join(hyp_all)
    total = {
        "words": word_accuracy(ref, hyp),
        "umlauts": char_class_accuracy(ref, hyp, UMLAUTS),
    }
    for r in rows:
        print(f"{r['page']}: palabras {r['words']:.1%} · umlauts/ß {r['umlauts']:.1%}")
    print(f"TOTAL: palabras {total['words']:.1%} · umlauts/ß {total['umlauts']:.1%}")
    (data / args.ocr / "metrics.json").write_text(json.dumps({"pages": rows, "total": total}))


if __name__ == "__main__":
    main()
