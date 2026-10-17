"""Spike: PDF escaneado → páginas lógicas → OCR Tesseract deu (RNF-03, RF-38, RF-39).

Uso: uv run python run_ocr.py ../../samples/libro.pdf [--dpi 300] [--psm 3]
Escribe en data/ (ignorado por git): páginas PNG, TSV de Tesseract y texto por página.
"""

import argparse
import csv
import io
import json
import re
import subprocess
import time
from pathlib import Path

import numpy as np
import pymupdf

from spike.hyphen import join_hyphenated
from spike.pages import downscale, footer_band, infer_printed_numbers, split_spread

DATA = Path("data")


def tesseract(png: bytes, *args: str) -> str:
    cmd = ["tesseract", "stdin", "stdout", *args]
    return subprocess.run(cmd, input=png, capture_output=True, check=True).stdout.decode()


def osd_rotation(png: bytes) -> int:
    try:
        out = tesseract(png, "--psm", "0")
    except subprocess.CalledProcessError:
        return 0
    m = re.search(r"Rotate: (\d+)", out)
    return int(m.group(1)) if m else 0


def to_png(gray: np.ndarray) -> bytes:
    h, w = gray.shape
    return pymupdf.Pixmap(pymupdf.csGRAY, w, h, gray.tobytes(), False).tobytes("png")


def ocr_words(png: bytes, psm: str) -> list[dict]:
    tsv = tesseract(png, "-l", "deu", "--oem", "1", "--psm", psm, "tsv")
    rows = csv.DictReader(io.StringIO(tsv), delimiter="\t", quoting=csv.QUOTE_NONE)
    return [r for r in rows if r["level"] == "5" and r["text"].strip()]


def group_lines(rows: list[dict]) -> list[list[dict]]:
    lines: dict[tuple, list[dict]] = {}
    for r in rows:
        lines.setdefault((int(r["block_num"]), int(r["par_num"]), int(r["line_num"])), []).append(r)
    return [lines[k] for k in sorted(lines)]


def printed_candidates(page: np.ndarray) -> list[int]:
    """Lecturas del número del pie con varias escalas y umbrales (la trama gris confunde)."""
    digits = "tessedit_char_whitelist=0123456789"
    found: list[int] = []
    for k in (2, 3):
        for threshold in (90, 110, 130):
            band = footer_band(downscale(page, k), threshold)
            text = tesseract(to_png(band), "--psm", "11", "-c", digits)
            found += [int(t) for t in text.split() if t.isdigit() and len(t) <= 4]
    return found


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--psm", default="3")
    ap.add_argument("--out", default="ocr")
    args = ap.parse_args()

    out = DATA / args.out
    (DATA / "pages").mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    summary = []
    n = 0
    for sheet in pymupdf.open(args.pdf):
        t0 = time.perf_counter()
        pm = sheet.get_pixmap(dpi=args.dpi, colorspace=pymupdf.csGRAY)
        gray = np.frombuffer(pm.samples, np.uint8).reshape(pm.h, pm.w)
        rot = osd_rotation(to_png(gray))
        if rot:
            gray = np.ascontiguousarray(np.rot90(gray, k=-rot // 90))
        for x0, x1 in split_spread(gray):
            n += 1
            page = np.ascontiguousarray(gray[:, x0:x1])
            png = to_png(page)
            (DATA / "pages" / f"{n:03}.png").write_bytes(png)
            rows = ocr_words(png, args.psm)
            lines = group_lines(rows)
            tokens = join_hyphenated([[r["text"] for r in ln] for ln in lines], known=set())
            confs = [float(r["conf"]) for r in rows if float(r["conf"]) >= 0]
            (out / f"{n:03}.raw.txt").write_text(
                "\n".join(" ".join(r["text"] for r in ln) for ln in lines), encoding="utf-8"
            )
            (out / f"{n:03}.txt").write_text(" ".join(t.text for t in tokens), encoding="utf-8")
            summary.append(
                {
                    "page": n,
                    "sheet": sheet.number,
                    "osd_rotate": rot,
                    "candidates": printed_candidates(page),
                    "words": len(rows),
                    "joined": sum(len(t.parts) > 1 for t in tokens),
                    "mean_conf": round(sum(confs) / max(len(confs), 1), 1),
                }
            )
        for s in summary:
            if s["sheet"] == sheet.number:
                s["seconds_sheet"] = round(time.perf_counter() - t0, 1)
    printed = infer_printed_numbers([s.pop("candidates") for s in summary])
    for s, p in zip(summary, printed, strict=True):
        s["printed"] = p
    (out / "summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    for s in summary:
        print(s)


if __name__ == "__main__":
    main()
