"""RF-51: recorre los libros con `pipeline_version` menor y los actualiza en sitio.

Garantías: cada JSON se sobreescribe solo tras validarlo (antes y después es válido), la versión
del libro se escribe al final y solo si todas sus páginas quedaron al día, y el fallo de un libro
no detiene a los demás. El registro lleva solo conteos y códigos (nunca texto, títulos ni rutas).
"""

import json
import logging

from pipeline.analyze import sentence_starts
from pipeline.version import PIPELINE_VERSION
from publish.client import SupabaseError
from upgrade.page import UpgradeError, upgrade_page


def _upgrade_book(client, book_id, *, nlp, translator, starts, version, dry_run, log) -> dict:
    """Devuelve conteos; `failed` > 0 significa que el libro NO se marcó como actualizado."""
    counts = {"pages": 0, "skipped_pages": 0, "failed": 0}
    for row in client.list_pages(book_id):
        try:
            page = json.loads(client.download_page_json(row["tokens_path"]))
            new = upgrade_page(page, nlp, translator, starts=starts)
            if new is None:
                counts["skipped_pages"] += 1
                continue
            if not dry_run:
                client.upload_page_json(
                    row["tokens_path"], json.dumps(new, ensure_ascii=False).encode("utf-8")
                )
            counts["pages"] += 1
        except UpgradeError as err:
            log.error("página %s no actualizada: %s", row.get("number"), err.code)
            counts["failed"] += 1
        except (SupabaseError, ValueError, KeyError, TypeError) as err:
            log.error("página %s no actualizada: %s", row.get("number"), type(err).__name__)
            counts["failed"] += 1
    if counts["failed"] == 0 and not dry_run:
        client.set_pipeline_version(book_id, version)
    return counts


def run_upgrade(
    client,
    *,
    nlp,
    translator,
    starts=sentence_starts,
    version: int = PIPELINE_VERSION,
    dry_run: bool = False,
    only: list[str] | None = None,
    log: logging.Logger | None = None,
) -> dict:
    log = log or logging.getLogger("upgrade")
    summary = {"upgraded": 0, "failed": 0, "pages": 0, "skipped_pages": 0}
    book_ids = client.books_to_upgrade(version)
    if only is not None:
        book_ids = [b for b in book_ids if b in only]
    log.info("libros por actualizar: %d%s", len(book_ids), " (simulacro)" if dry_run else "")
    for n, book_id in enumerate(book_ids, 1):
        try:
            counts = _upgrade_book(
                client,
                book_id,
                nlp=nlp,
                translator=translator,
                starts=starts,
                version=version,
                dry_run=dry_run,
                log=log,
            )
        except SupabaseError as err:
            log.error("libro %d/%d: error de Supabase (%s)", n, len(book_ids), err)
            summary["failed"] += 1
            continue
        summary["pages"] += counts["pages"]
        summary["skipped_pages"] += counts["skipped_pages"]
        if counts["failed"]:
            summary["failed"] += 1
        elif not dry_run:
            summary["upgraded"] += 1
        log.info(
            "libro %d/%d: %d páginas nuevas, %d ya al día, %d con error",
            n,
            len(book_ids),
            counts["pages"],
            counts["skipped_pages"],
            counts["failed"],
        )
    return summary
