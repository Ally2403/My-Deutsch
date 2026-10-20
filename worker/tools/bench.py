"""Banco de pruebas del procesamiento (RNF-18): páginas por minuto y segundos por etapa.

Uso (dentro de la imagen del worker, ver worker/run.sh):
    uv run python tools/bench.py "samples/Der Schatz-3-7.pdf" --lexicon .local/lexicon.sqlite \
        --workers 3 [--out /tmp/bench-out] [--max-sheets 40] [--no-translate]

Imprime una línea JSON con páginas/min, la suma de segundos por etapa y una huella SHA-256 de la
salida (JSON de páginas, manifest.json y lexicon.json) para comprobar que dos ejecuciones con
distinto número de hilos producen exactamente lo mismo. Solo números: nunca texto del libro.
"""

import argparse
import hashlib
import json
import shutil
import sys
import tempfile
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lexicon.store import Lexicon
from lexicon.translate import NullTranslator
from pipeline.run import configure_logging, process_pdf, reset_output


def output_digest(out: Path) -> str:
    """Huella de lo que se publica: páginas JSON, manifiesto y léxico (sin tiempos)."""
    digest = hashlib.sha256()
    files = sorted((out / "pages").glob("*.json")) + [out / "manifest.json", out / "lexicon.json"]
    for f in files:
        if f.name.endswith(".meta.json"):
            continue
        digest.update(f.name.encode())
        digest.update(f.read_bytes())
    return digest.hexdigest()


def trim_pdf(pdf: Path, max_sheets: int, dest: Path) -> Path:
    with pymupdf.open(pdf) as doc:
        if len(doc) <= max_sheets:
            return pdf
        doc.select(list(range(max_sheets)))
        doc.save(dest)
    return dest


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--lexicon", type=Path, required=True)
    ap.add_argument("--workers", type=int, default=1)
    ap.add_argument("--out", type=Path, default=None, help="carpeta de salida (se reinicia)")
    ap.add_argument("--max-sheets", type=int, default=0, help="solo las primeras N hojas")
    ap.add_argument("--no-translate", action="store_true")
    args = ap.parse_args(argv)

    import spacy

    configure_logging()
    if args.no_translate:
        translator = NullTranslator()
    else:
        from lexicon.opus import OpusTranslator

        translator = OpusTranslator()
    nlp = spacy.load("de_core_news_md")
    tmp = Path(tempfile.mkdtemp(prefix="bench-"))
    try:
        out = args.out or tmp / "out"
        reset_output(out)
        pdf = args.pdf
        if args.max_sheets:
            pdf = trim_pdf(pdf, args.max_sheets, tmp / "trim.pdf")
        kwargs = {"workers": args.workers} if args.workers > 1 else {}
        summary = process_pdf(
            pdf, out, lex=Lexicon(args.lexicon), nlp=nlp, translator=translator, **kwargs
        )
        minutes = summary["seconds"] / 60
        print(
            json.dumps(
                {
                    "workers": args.workers,
                    "pages": summary["pages"],
                    "sheets": summary["sheets"],
                    "seconds": summary["seconds"],
                    "pages_per_min": round(summary["pages"] / minutes, 1) if minutes else None,
                    "stage_seconds": summary["stage_seconds"],
                    "digest": output_digest(out),
                }
            )
        )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
