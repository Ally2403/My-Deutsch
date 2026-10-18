"""Punto de entrada del workflow `process-book.yml` (ADR-002).

Uso: python -m publish --book-id <uuid> --lexicon <ruta.sqlite>
Lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del entorno; nunca los imprime.
"""

import argparse
import sys
import tempfile
from collections.abc import Mapping
from pathlib import Path

from pipeline.run import configure_logging
from publish.client import Supabase
from publish.job import UUID_RE, JobError, run_job

REQUIRED_ENV = ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")


def _load(lexicon: Path):
    import spacy

    from lexicon.store import Lexicon
    from lexicon.translate import ArgosTranslator

    return Lexicon(lexicon), spacy.load("de_core_news_md"), ArgosTranslator()


def main(argv: list[str], env: Mapping[str, str]) -> int:
    ap = argparse.ArgumentParser(prog="publish")
    ap.add_argument("--book-id", required=True)
    ap.add_argument("--lexicon", type=Path, required=True)
    args = ap.parse_args(argv)

    missing = [name for name in REQUIRED_ENV if not env.get(name)]
    if missing:
        print(f"Faltan variables de entorno: {', '.join(missing)}", file=sys.stderr)
        return 2
    if not UUID_RE.match(args.book_id):
        print("Error: invalid_book_id", file=sys.stderr)
        return 1

    configure_logging()
    lex, nlp, translator = _load(args.lexicon)
    client = Supabase(env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    with tempfile.TemporaryDirectory() as tmp:
        try:
            run_job(
                args.book_id,
                client,
                workdir=Path(tmp),
                lex=lex,
                nlp=nlp,
                translator=translator,
            )
        except JobError as err:
            print(f"Error: {err.code}", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    import os

    sys.exit(main(sys.argv[1:], os.environ))
