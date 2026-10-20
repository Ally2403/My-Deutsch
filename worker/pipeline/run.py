"""PDF escaneado → páginas WebP + JSON de tokens v1, reanudable por página (RF-12).

Uso: python -m pipeline.run libro.pdf --out .local/book --lexicon .local/lexicon.sqlite

ADR-002: el registro solo lleva números de página, conteos y tiempos; nunca texto OCR.
"""

import argparse
import json
import logging
import os
import shutil
import time
from collections.abc import Callable
from pathlib import Path

import numpy as np
import pymupdf

from lexicon.store import Lexicon
from lexicon.translate import NullTranslator, Translator
from pipeline.analyze import analyze
from pipeline.fields import detect_fields, detect_lines, merge_fields
from pipeline.geometry import build_tokens, words_from_rows
from pipeline.image import MAX_INPUT_PIXELS, render_webp, webp_size
from pipeline.images import detect_images
from pipeline.noise import drop_noise
from pipeline.ocr import ocr_words, osd_rotation, printed_candidates, to_png
from pipeline.page_json import LexRegistry, build_page, validate_page
from pipeline.pages import infer_printed_numbers, split_spread

DPI = 300
MAX_DOC_SECONDS = 4.5 * 3600  # un trabajo de Actions nunca dura más de 5 h (ADR-002)


STAGES = ("rot", "ocr", "printed", "analyze", "translate", "webp", "publish")


class StageTimes:
    """Segundos acumulados por etapa (RNF-18). Solo números: nunca texto del libro (ADR-002)."""

    def __init__(self) -> None:
        self.total = dict.fromkeys(STAGES, 0.0)

    def add(self, stage: str, seconds: float) -> None:
        self.total[stage] += seconds

    def timed(self, stage: str, fn, *args):
        t0 = time.monotonic()
        try:
            return fn(*args)
        finally:
            self.add(stage, time.monotonic() - t0)

    def rounded(self) -> dict[str, float]:
        return {k: round(v, 2) for k, v in self.total.items()}


class _TimedTranslator:
    """Mide el tiempo de traducción sin cambiar el resultado."""

    def __init__(self, inner: Translator, times: StageTimes) -> None:
        self._inner, self._times = inner, times

    def from_german(self, text: str) -> str:
        return self._times.timed("translate", self._inner.from_german, text)

    def from_english(self, text: str) -> str:
        return self._times.timed("translate", self._inner.from_english, text)


class Engine:
    """Operaciones que usan Tesseract; se sustituyen en las pruebas."""

    def rows(self, png: bytes) -> list[dict]:
        return ocr_words(png)

    def rotation(self, png: bytes) -> int:
        return osd_rotation(png)

    def printed(self, gray: np.ndarray) -> list[int]:
        return printed_candidates(gray)


def _write_json(path: Path, data: object) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def _write_bytes(path: Path, data: bytes) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)


def _is_done(pages: Path, n: int) -> bool:
    """Una página está terminada si su JSON (que se escribe al final) existe y valida."""
    files = [pages / f"{n}.json", pages / f"{n}.webp", pages / f"{n}.meta.json"]
    if not all(f.exists() for f in files):
        return False
    try:
        validate_page(json.loads(files[0].read_text(encoding="utf-8")))
    except (ValueError, json.JSONDecodeError):
        return False
    return True


def _render(sheet: pymupdf.Page, dpi: int, index: int) -> np.ndarray:
    pixels = sheet.rect.width * dpi / 72 * sheet.rect.height * dpi / 72
    if pixels > MAX_INPUT_PIXELS:
        raise ValueError(f"La hoja {index} es demasiado grande ({pixels / 1e6:.0f} Mpx)")
    pm = sheet.get_pixmap(dpi=dpi, colorspace=pymupdf.csGRAY)
    return np.frombuffer(pm.samples, np.uint8).reshape(pm.h, pm.w)


def process_pdf(
    pdf: Path,
    out: Path,
    *,
    lex: Lexicon,
    nlp,
    translator: Translator,
    engine: Engine | None = None,
    dpi: int = DPI,
    budget_s: float = MAX_DOC_SECONDS,
    log: logging.Logger | None = None,
    on_start: Callable[[int], None] | None = None,
    on_page: Callable[[int, Path], None] | None = None,
    on_sheet: Callable[[int], None] | None = None,
) -> dict:
    engine = engine or Engine()
    log = log or logging.getLogger("pipeline")
    pages = out / "pages"
    pages.mkdir(parents=True, exist_ok=True)
    registry_path = out / "lexicon.json"
    registry = (
        LexRegistry.from_dict(json.loads(registry_path.read_text(encoding="utf-8")))
        if registry_path.exists()
        else LexRegistry()
    )
    started = time.monotonic()
    times = StageTimes()
    timed_translator = _TimedTranslator(translator, times)
    n = skipped = 0
    _write_json(out / "progress.json", {"status": "running", "pages_done": 0})
    try:
        with pymupdf.open(pdf) as doc:
            if on_start:
                on_start(len(doc))
            for index, sheet in enumerate(doc, start=1):
                if time.monotonic() - started > budget_s:
                    raise TimeoutError("Se agotó el tiempo total asignado al libro")
                t_rot = time.monotonic()
                gray = _render(sheet, dpi, index)
                rotation = engine.rotation(to_png(gray))
                times.add("rot", time.monotonic() - t_rot)
                if rotation:
                    gray = np.ascontiguousarray(np.rot90(gray, k=-rotation // 90))
                for x0, x1 in split_spread(gray):
                    n += 1
                    if _is_done(pages, n):
                        skipped += 1
                        log.info("página %d ya procesada, se omite", n)
                        if on_page:
                            on_page(n, pages)
                        continue
                    page = np.ascontiguousarray(gray[:, x0:x1])
                    t0 = time.monotonic()
                    before = times.rounded()
                    count = _process_page(
                        page, n, pages, engine, lex, nlp, timed_translator, registry, times
                    )
                    _write_json(registry_path, registry.to_dict())
                    _write_json(out / "progress.json", {"status": "running", "pages_done": n})
                    if on_page:
                        t_pub = time.monotonic()
                        on_page(n, pages)
                        times.add("publish", time.monotonic() - t_pub)
                    after = times.rounded()
                    detail = " ".join(f"{k}={after[k] - before[k]:.1f}" for k in STAGES)
                    log.info(
                        "página %d: %d tokens, %.1f s (%s)",
                        n,
                        count,
                        time.monotonic() - t0,
                        detail,
                    )
                if on_sheet:  # RF-46: el avance cuenta hojas del PDF, no páginas lógicas
                    on_sheet(index)
            sheets = len(doc)
    except Exception as exc:
        _write_json(out / "progress.json", {"status": "error", "pages_done": max(n - 1, 0)})
        log.error("falló en la página %d: %s", n, type(exc).__name__)
        raise

    metas = [
        json.loads((pages / f"{i}.meta.json").read_text(encoding="utf-8")) for i in range(1, n + 1)
    ]
    printed = infer_printed_numbers([m["candidates"] for m in metas])
    entries = [
        {
            "number": i,
            "printed_number": printed[i - 1],
            "width": m["width"],
            "height": m["height"],
            "ocr_confidence": m["ocr_confidence"],
        }
        for i, m in enumerate(metas, start=1)
    ]
    confs = [m["ocr_confidence"] for m in metas if m["ocr_confidence"] is not None]
    stable = {
        "pages": n,
        "sheets": sheets,
        "mean_confidence": round(sum(confs) / len(confs), 1) if confs else None,
    }
    summary = {
        **stable,
        "skipped": skipped,
        "seconds": round(time.monotonic() - started, 1),
        "stage_seconds": times.rounded(),
    }
    # RNF-18: el manifiesto solo lleva datos deterministas (sin tiempos), para que la salida
    # sea idéntica byte a byte con cualquier número de hilos y tras una reanudación.
    _write_json(out / "manifest.json", {"pages": entries, "summary": stable})
    _write_json(out / "progress.json", {"status": "done", "pages_done": n})
    log.info("libro terminado: %d páginas en %.1f s", n, summary["seconds"])
    return summary


def _process_page(page, n, pages, engine, lex, nlp, translator, registry, times) -> int:
    height, width = page.shape
    rows = times.timed("ocr", lambda: engine.rows(to_png(page)))
    raw_words = words_from_rows(rows, width, height)
    # RF-34: antes de drop_noise, que descarta las líneas «____», y además las rayas de la imagen
    fields = merge_fields(detect_fields(raw_words), detect_lines(page))
    images = detect_images(page, [w.box for w in raw_words])  # RF-18
    words = drop_noise(raw_words)
    tokens = build_tokens(words, known=lambda w: bool(lex.lookup_form(w.lower())))
    analyzed = times.timed("analyze", lambda: analyze(tokens, nlp, lex))
    size = webp_size(page.shape)
    data = build_page(size, tokens, analyzed, lex, translator, registry, fields, images)
    validate_page(data)
    confs = [w.conf for w in words if w.conf >= 0]
    meta = {
        "width": size[0],
        "height": size[1],
        "ocr_confidence": round(sum(confs) / len(confs), 1) if confs else None,
        "candidates": times.timed("printed", engine.printed, page),
    }
    _write_bytes(pages / f"{n}.webp", times.timed("webp", render_webp, page))
    _write_json(pages / f"{n}.meta.json", meta)
    _write_json(pages / f"{n}.json", data)  # al final: su existencia marca la página como lista
    return len(tokens)


def reset_output(out: Path) -> None:
    """Borra solo lo que genera el worker (páginas, manifiesto, avance, ids de léxico) para
    reprocesar un libro desde cero; cualquier otro archivo de la carpeta se respeta."""
    shutil.rmtree(out / "pages", ignore_errors=True)
    for name in ("manifest.json", "progress.json", "lexicon.json"):
        (out / name).unlink(missing_ok=True)


def configure_logging() -> None:
    """Solo el avance del worker (INFO); las bibliotecas de terceros (transformers) en WARNING."""
    logging.basicConfig(level=logging.WARNING, format="%(asctime)s %(message)s")
    logging.getLogger("pipeline").setLevel(logging.INFO)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--lexicon", type=Path, required=True)
    ap.add_argument("--dpi", type=int, default=DPI)
    ap.add_argument("--no-translate", action="store_true", help="sin traducción automática")
    ap.add_argument(
        "--force", action="store_true", help="reprocesar desde cero (ignora lo ya hecho)"
    )
    args = ap.parse_args()

    import spacy

    configure_logging()
    if args.force:
        reset_output(args.out)
    if args.no_translate:
        translator = NullTranslator()
    else:
        from lexicon.opus import OpusTranslator

        translator = OpusTranslator()
    summary = process_pdf(
        args.pdf,
        args.out,
        lex=Lexicon(args.lexicon),
        nlp=spacy.load("de_core_news_md"),
        translator=translator,
        dpi=args.dpi,
    )
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
