"""Punto de entrada del workflow `upgrade-books.yml` (RF-51).

Uso: python -m upgrade [--dry-run] [--book-id <uuid> ...]
Lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del entorno; nunca los imprime.
"""

import argparse
import sys
from collections.abc import Mapping

from pipeline.run import configure_logging
from publish.client import Supabase
from publish.job import UUID_RE
from upgrade.job import run_upgrade

REQUIRED_ENV = ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")


def _load():
    import spacy

    from lexicon.opus import OpusTranslator

    return spacy.load("de_core_news_md"), OpusTranslator()


def main(argv: list[str], env: Mapping[str, str]) -> int:
    ap = argparse.ArgumentParser(prog="upgrade")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--book-id", action="append", default=None)
    args = ap.parse_args(argv)

    missing = [name for name in REQUIRED_ENV if not env.get(name)]
    if missing:
        print(f"Faltan variables de entorno: {', '.join(missing)}", file=sys.stderr)
        return 2
    if args.book_id and not all(UUID_RE.match(b) for b in args.book_id):
        print("Error: invalid_book_id", file=sys.stderr)
        return 1

    configure_logging()
    nlp, translator = _load()
    client = Supabase(env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    summary = run_upgrade(
        client, nlp=nlp, translator=translator, dry_run=args.dry_run, only=args.book_id
    )
    print(
        f"Actualizados: {summary['upgraded']} · con error: {summary['failed']} · "
        f"páginas nuevas: {summary['pages']} · ya al día: {summary['skipped_pages']}"
    )
    return 1 if summary["failed"] else 0


if __name__ == "__main__":
    import os

    sys.exit(main(sys.argv[1:], os.environ))
