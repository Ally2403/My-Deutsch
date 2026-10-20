"""Un trabajo de procesamiento: descarga el PDF, verifica su huella, lo procesa y publica (RF-12).

RN-02: la huella se recalcula aquí y debe coincidir con `books.sha256`.
RN-10: máximo 400 páginas del PDF.
ADR-002: el registro lleva solo números de página y códigos; nunca texto OCR, títulos ni rutas.
"""

import hashlib
import json
import logging
import re
from pathlib import Path

import pymupdf

from pipeline.page_json import validate_page
from pipeline.run import DPI, process_pdf
from publish.client import SupabaseError
from publish.remap import lexicon_row, remap_page

MAX_PDF_PAGES = 400
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


class JobError(Exception):
    """Fallo del trabajo; `code` es lo único que se guarda en la base y en el registro."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class _PublishError(Exception):
    pass


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _check_pdf(path: Path) -> int:
    """Número de hojas del PDF; `JobError` si no se puede leer, está cifrado, vacío o es enorme."""
    try:
        with pymupdf.open(path) as doc:
            if doc.needs_pass or doc.is_encrypted:
                raise JobError("invalid_pdf")
            count = len(doc)
    except JobError:
        raise
    except Exception:  # noqa: BLE001 - cualquier fallo al abrir es un PDF inválido
        raise JobError("invalid_pdf") from None
    if count == 0:
        raise JobError("empty_book")
    if count > MAX_PDF_PAGES:
        raise JobError("too_many_pages")
    return count


def _read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


class _Publisher:
    def __init__(self, client, book_id: str, out: Path) -> None:
        self.client, self.book_id, self.out = client, book_id, out
        self.mapping: dict[int, int] = {}  # id local del libro → lexicon.id de Postgres

    def sheets(self, count: int) -> None:
        try:
            self.client.update_job(self.book_id, pages_total=count)
        except SupabaseError:
            raise _PublishError from None

    def page(self, n: int, pages: Path) -> None:
        try:
            self._publish(n, pages)
        except (SupabaseError, KeyError, ValueError):
            raise _PublishError from None

    def _publish(self, n: int, pages: Path) -> None:
        data, meta = _read(pages / f"{n}.json"), _read(pages / f"{n}.meta.json")
        entries = _read(self.out / "lexicon.json")["entries"]
        missing = [int(k) for k in data["lex"] if int(k) not in self.mapping]
        if missing:
            rows = [lexicon_row(entries[str(i)]) for i in missing]
            ids = self.client.upsert_lexicon(rows)
            for i, row in zip(missing, rows, strict=True):
                self.mapping[i] = ids[(row["lemma"], row["pos"])]
        remapped = remap_page(data, self.mapping)
        validate_page(remapped)
        self.client.upload_page_files(
            self.book_id,
            n,
            (pages / f"{n}.webp").read_bytes(),
            json.dumps(remapped, ensure_ascii=False).encode("utf-8"),
        )
        self.client.upsert_page_row(
            {
                "book_id": self.book_id,
                "number": n,
                "width": meta["width"],
                "height": meta["height"],
                "image_path": f"{self.book_id}/{n}.webp",
                "tokens_path": f"{self.book_id}/{n}.json",
                "ocr_confidence": meta["ocr_confidence"],
            }
        )

    def sheet_done(self, index: int) -> None:
        """RF-46: pages_done cuenta hojas del PDF (igual que pages_total), nunca páginas lógicas."""
        try:
            self.client.update_job(self.book_id, pages_done=index)
        except SupabaseError:
            raise _PublishError from None


def run_job(
    book_id: str,
    client,
    *,
    workdir: Path,
    lex,
    nlp,
    translator,
    engine=None,
    dpi: int = DPI,
    log: logging.Logger | None = None,
) -> str:
    """Devuelve "done" o "skipped"; ante un fallo deja el libro en `error` y lanza `JobError`."""
    log = log or logging.getLogger("pipeline")
    if not UUID_RE.match(book_id):
        raise JobError("invalid_book_id")
    book = client.get_book(book_id)
    if book is None or book["status"] != "queued":
        log.info("libro omitido: no existe o no está en cola")
        return "skipped"
    if not client.claim_book(book_id):
        log.info("libro omitido: otra ejecución lo tomó")
        return "skipped"

    workdir.mkdir(parents=True, exist_ok=True)
    pdf, out = workdir / "book.pdf", workdir / "out"
    upload_path = book["upload_path"]
    try:
        try:
            client.download_upload(upload_path, pdf)
            if _sha256(pdf) != book["sha256"]:
                raise JobError("hash_mismatch")
            _check_pdf(pdf)
            publisher = _Publisher(client, book_id, out)
            summary = process_pdf(
                pdf,
                out,
                lex=lex,
                nlp=nlp,
                translator=translator,
                engine=engine,
                dpi=dpi,
                log=log,
                on_start=publisher.sheets,
                on_page=publisher.page,
                on_sheet=publisher.sheet_done,
            )
            _finish(client, book_id, out, summary)
        except _PublishError:
            raise JobError("publish_failed") from None
        except SupabaseError:
            raise JobError("publish_failed") from None
        except JobError:
            raise
        except Exception as exc:  # noqa: BLE001 - el libro nunca debe quedar «procesando»
            log.error("el procesamiento falló: %s", type(exc).__name__)
            raise JobError("processing_failed") from None
    except JobError as err:
        log.error("libro en error: %s", err.code)
        try:
            client.fail_book(book_id, err.code)
        except SupabaseError:
            log.error("no se pudo marcar el libro en error")
        raise
    finally:
        pdf.unlink(missing_ok=True)

    try:
        client.delete_upload(upload_path)
    except SupabaseError:
        log.warning("no se pudo borrar el archivo subido")
    return "done"


def _finish(client, book_id: str, out: Path, summary: dict) -> None:
    if summary["pages"] == 0:
        raise JobError("empty_book")
    manifest = _read(out / "manifest.json")
    client.set_printed_numbers(
        book_id,
        [
            {
                "number": p["number"],
                "printed_number": p["printed_number"],
                "width": p["width"],
                "height": p["height"],
                "ocr_confidence": p["ocr_confidence"],
                "image_path": f"{book_id}/{p['number']}.webp",
                "tokens_path": f"{book_id}/{p['number']}.json",
            }
            for p in manifest["pages"]
        ],
    )
    # RF-46: el avance del trabajo cuenta hojas del PDF; books.page_count lleva las páginas lógicas
    client.update_job(book_id, pages_total=summary["sheets"], pages_done=summary["sheets"])
    client.finish_book(
        book_id, page_count=summary["pages"], ocr_confidence=summary["mean_confidence"]
    )
