"""PDF escaneado → páginas WebP + JSON de tokens v1, reanudable por página (RF-12).

Uso: python -m pipeline.run libro.pdf --out .local/book --lexicon .local/lexicon.sqlite

Dos etapas (RNF-18): la A (`pipeline.prepare`: render, orientación, OCR, número impreso, campos,
ilustraciones, WebP) corre en hilos, hasta `workers` hojas a la vez; la B (numeración, análisis,
traducción, escritura y publicación) corre en el hilo principal, **en orden**. Con `workers=1` la
etapa A se ejecuta en línea: es el modo secuencial de referencia y produce la misma salida.

ADR-002: el registro solo lleva números de página, conteos y tiempos; nunca texto OCR.
"""

import argparse
import json
import logging
import os
import shutil
import threading
import time
import traceback
from collections.abc import Callable
from concurrent.futures import Future, ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pymupdf

from lexicon.store import Lexicon
from lexicon.translate import NullTranslator, Translator
from pipeline.analyze import analyze
from pipeline.geometry import build_tokens
from pipeline.ocr import (
    ocr_words,
    osd_rotation,
    printed_candidates,
    single_thread_env,
)
from pipeline.page_json import LexRegistry, build_page, validate_page
from pipeline.pages import infer_printed_numbers
from pipeline.prepare import PreparedPage, prepare_sheet

DPI = 300
MAX_DOC_SECONDS = 4.5 * 3600  # un trabajo de Actions nunca dura más de 5 h (ADR-002)
MAX_AHEAD = 4  # hojas de adelanto de la etapa A sobre la B: acota la memoria

STAGES = ("rot", "ocr", "printed", "analyze", "translate", "webp", "publish")


class StageTimes:
    """Segundos acumulados por etapa (RNF-18). Solo números: nunca texto del libro (ADR-002).
    Los segundos de la etapa A se suman entre hilos (tiempo de CPU, no de reloj)."""

    def __init__(self) -> None:
        self.total = dict.fromkeys(STAGES, 0.0)
        self._lock = threading.Lock()

    def add(self, stage: str, seconds: float) -> None:
        with self._lock:
            self.total[stage] += seconds

    def timed(self, stage: str, fn, *args):
        t0 = time.monotonic()
        try:
            return fn(*args)
        finally:
            self.add(stage, time.monotonic() - t0)

    def rounded(self) -> dict[str, float]:
        with self._lock:
            return {k: round(v, 2) for k, v in self.total.items()}


class _TimedTranslator:
    """Mide el tiempo de traducción sin cambiar el resultado."""

    def __init__(self, inner: Translator, times: StageTimes) -> None:
        self._inner, self._times = inner, times

    def from_german(self, text: str) -> str:
        return self._times.timed("translate", self._inner.from_german, text)

    def from_english(self, text: str) -> str:
        return self._times.timed("translate", self._inner.from_english, text)

    def from_german_many(self, texts: list[str]) -> list[str]:
        many = getattr(self._inner, "from_german_many", None)
        if many is None:
            return [""] * len(texts)
        return self._times.timed("translate", many, texts)

    def warm(self, german: list[str], english: list[str]) -> None:
        warm = getattr(self._inner, "warm", None)
        if warm is not None:
            warm(german, english)


class Engine:
    """Operaciones que usan Tesseract; se sustituyen en las pruebas. Con `single_thread` cada
    proceso de Tesseract usa un solo hilo OpenMP (varios a la vez, RNF-18)."""

    def __init__(self, single_thread: bool = False) -> None:
        self._env = single_thread_env() if single_thread else None

    def rows(self, png: bytes) -> list[dict]:
        return ocr_words(png, env=getattr(self, "_env", None))

    def rotation(self, png: bytes) -> int:
        return osd_rotation(png, env=getattr(self, "_env", None))

    def printed(self, gray: np.ndarray) -> list[int]:
        return printed_candidates(gray, env=getattr(self, "_env", None))


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


def _scan_done(pages: Path) -> dict[int, tuple[int, frozenset[int]]]:
    """Reanudación: por hoja, cuántas páginas lógicas tiene y cuáles ya están terminadas en disco
    (cada `meta.json` guarda su hoja y su posición). Lo que no se pueda leer cuenta como no hecho.
    """
    found: dict[int, tuple[int, set[int]]] = {}
    for meta_file in pages.glob("*.meta.json"):
        try:
            n = int(meta_file.name.split(".")[0])
            meta = json.loads(meta_file.read_text(encoding="utf-8"))
            sheet, part, parts = meta["sheet"], meta["part"], meta["parts"]
        except (ValueError, KeyError, json.JSONDecodeError):
            continue
        if not all(type(v) is int for v in (sheet, part, parts)) or not _is_done(pages, n):
            continue
        found.setdefault(sheet, (parts, set()))[1].add(part)
    return {sheet: (parts, frozenset(done)) for sheet, (parts, done) in found.items()}


def _publish_page(
    pp: PreparedPage,
    n: int,
    index: int,
    pages: Path,
    registry_path: Path,
    lex: Lexicon,
    nlp,
    translator,
    registry: LexRegistry,
    times: StageTimes,
) -> int:
    """Etapa B de una página: tokens, análisis, traducción y archivos (el JSON, al final)."""
    tokens = build_tokens(pp.words, known=lambda w: bool(lex.lookup_form(w.lower())))
    analyzed = times.timed("analyze", lambda: analyze(tokens, nlp, lex))
    times.timed("translate", registry.warm, analyzed, lex, translator)
    data = build_page(pp.size, tokens, analyzed, lex, translator, registry, pp.fields, pp.images)
    validate_page(data)
    meta = {
        "width": pp.size[0],
        "height": pp.size[1],
        "ocr_confidence": pp.ocr_confidence,
        "candidates": pp.candidates,
        "sheet": index,
        "part": pp.part,
        "parts": pp.parts,
    }
    _write_json(registry_path, registry.to_dict())
    _write_bytes(pages / f"{n}.webp", pp.webp)
    _write_json(pages / f"{n}.meta.json", meta)
    _write_json(pages / f"{n}.json", data)  # al final: su existencia marca la página como lista
    return len(tokens)


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
    workers: int = 3,
) -> dict:
    workers = max(1, workers)
    engine = engine or Engine(single_thread=workers > 1)
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
    resume = _scan_done(pages)
    n = skipped = sheets = 0
    pool: ThreadPoolExecutor | None = (
        ThreadPoolExecutor(max_workers=workers) if workers > 1 else None
    )
    _write_json(out / "progress.json", {"status": "running", "pages_done": 0})

    def check_budget() -> None:
        if time.monotonic() - started > budget_s:
            raise TimeoutError("Se agotó el tiempo total asignado al libro")

    def prepare(index: int):
        return prepare_sheet(pdf, index, dpi, engine, times, resume.get(index))

    try:
        with pymupdf.open(pdf) as doc:
            sheets = len(doc)
        if on_start:
            on_start(sheets)
        ahead = min(MAX_AHEAD, workers + 1)
        futures: dict[int, Future] = {}
        next_submit = 1
        for index in range(1, sheets + 1):
            check_budget()
            if pool is None:
                prepared = prepare(index)
            else:
                while next_submit <= sheets and next_submit < index + ahead:
                    check_budget()
                    futures[next_submit] = pool.submit(prepare, next_submit)
                    next_submit += 1
                prepared = futures.pop(index).result()
            for pp in prepared.pages:
                n += 1
                if pp.error is not None:
                    raise pp.error
                if pp.skip:
                    if not _is_done(pages, n):
                        raise RuntimeError("La reanudación no coincide con lo ya procesado")
                    skipped += 1
                    log.info("página %d ya procesada, se omite", n)
                    if on_page:
                        on_page(n, pages)
                    continue
                t0 = time.monotonic()
                before = times.rounded()
                count = _publish_page(
                    pp, n, index, pages, registry_path, lex, nlp, timed_translator, registry, times
                )
                _write_json(out / "progress.json", {"status": "running", "pages_done": n})
                if on_page:
                    t_pub = time.monotonic()
                    on_page(n, pages)
                    times.add("publish", time.monotonic() - t_pub)
                after = times.rounded()
                detail = " ".join(
                    [f"{k}={pp.seconds.get(k, 0.0):.1f}" for k in ("ocr", "printed", "webp")]
                    + [
                        f"{k}={after[k] - before[k]:.1f}"
                        for k in ("analyze", "translate", "publish")
                    ]
                )
                log.info(
                    "página %d: %d tokens, %.1f s en la etapa B (%s)",
                    n,
                    count,
                    time.monotonic() - t0,
                    detail,
                )
            if prepared.error is not None:
                raise prepared.error
            if on_sheet:  # RF-46: el avance cuenta hojas del PDF, no páginas lógicas
                on_sheet(index)
    except Exception as exc:
        _write_json(out / "progress.json", {"status": "error", "pages_done": max(n - 1, 0)})
        # Diagnóstico sin contenido del libro: solo el mensaje de nuestros propios ValueError (son
        # genéricos: tamaños, ids) y el archivo:línea donde se lanzó.
        frames = traceback.extract_tb(exc.__traceback__)
        where = f"{Path(frames[-1].filename).name}:{frames[-1].lineno}" if frames else "?"
        detail = str(exc) if isinstance(exc, ValueError) else ""
        log.error("falló en la página %d: %s en %s %s", n, type(exc).__name__, where, detail)
        raise
    finally:
        if pool is not None:
            pool.shutdown(wait=True, cancel_futures=True)

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


def default_workers() -> int:
    """Hojas en paralelo según los núcleos disponibles (tope 4: el runner de Actions tiene 4)."""
    return max(1, min(4, os.cpu_count() or 1))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--lexicon", type=Path, required=True)
    ap.add_argument("--dpi", type=int, default=DPI)
    ap.add_argument("--workers", type=int, default=default_workers())
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
        workers=args.workers,
    )
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
