"""Cliente mínimo de Supabase (PostgREST + Storage) con la service role key (RF-12, ADR-002).

Los mensajes de error llevan solo la operación y el código HTTP: nunca cabeceras, cuerpos ni la
clave (el repositorio es público y los registros de Actions también).
"""

import time
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

import httpx

from pipeline.version import PIPELINE_VERSION

LEXICON_BATCH = 500
ATTEMPTS = 3


class SupabaseError(Exception):
    pass


def _now() -> str:
    return datetime.now(UTC).isoformat()


class Supabase:
    def __init__(
        self,
        url: str,
        service_key: str,
        *,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._sleep = sleep
        self._http = httpx.Client(
            base_url=url.rstrip("/"),
            headers={"apikey": service_key, "Authorization": f"Bearer {service_key}"},
            timeout=60,
            transport=transport,
        )

    def _request(self, op: str, method: str, path: str, **kwargs) -> httpx.Response:
        for attempt in range(1, ATTEMPTS + 1):
            try:
                resp = self._http.request(method, path, **kwargs)
            except httpx.TransportError as exc:
                if attempt == ATTEMPTS:
                    raise SupabaseError(f"{op}: {type(exc).__name__}") from None
            else:
                if resp.status_code < 400:
                    return resp
                if resp.status_code < 500 or attempt == ATTEMPTS:
                    raise SupabaseError(f"{op}: HTTP {resp.status_code}")
            self._sleep(2 ** (attempt - 1))
        raise AssertionError("unreachable")  # pragma: no cover

    def _patch(self, op: str, table: str, params: dict, body: dict) -> list[dict]:
        resp = self._request(
            op,
            "PATCH",
            f"/rest/v1/{table}",
            params=params,
            json=body,
            headers={"Prefer": "return=representation"},
        )
        return resp.json()

    def get_book(self, book_id: str) -> dict | None:
        resp = self._request(
            "get_book",
            "GET",
            "/rest/v1/books",
            params={"id": f"eq.{book_id}", "select": "id,sha256,status,upload_path"},
        )
        rows = resp.json()
        return rows[0] if rows else None

    def claim_book(self, book_id: str) -> bool:
        rows = self._patch(
            "claim_book",
            "books",
            {"id": f"eq.{book_id}", "status": "eq.queued"},
            {"status": "processing"},
        )
        if not rows:
            return False
        self._patch(
            "claim_job",
            "jobs",
            {"book_id": f"eq.{book_id}", "status": "eq.queued"},
            {"status": "processing", "started_at": _now()},
        )
        return True

    def download_upload(self, upload_path: str, dest: Path) -> None:
        op = "download_upload"
        for attempt in range(1, ATTEMPTS + 1):
            try:
                with self._http.stream("GET", f"/storage/v1/object/uploads/{upload_path}") as r:
                    if r.status_code >= 400:
                        if r.status_code < 500 or attempt == ATTEMPTS:
                            raise SupabaseError(f"{op}: HTTP {r.status_code}")
                    else:
                        with dest.open("wb") as fh:
                            for chunk in r.iter_bytes():
                                fh.write(chunk)
                        return
            except httpx.TransportError as exc:
                if attempt == ATTEMPTS:
                    raise SupabaseError(f"{op}: {type(exc).__name__}") from None
            self._sleep(2 ** (attempt - 1))

    def upsert_lexicon(self, rows: list[dict]) -> dict[tuple[str, str], int]:
        ids: dict[tuple[str, str], int] = {}
        for start in range(0, len(rows), LEXICON_BATCH):
            resp = self._request(
                "upsert_lexicon",
                "POST",
                "/rest/v1/lexicon",
                params={"on_conflict": "lemma,pos"},
                json=rows[start : start + LEXICON_BATCH],
                headers={"Prefer": "resolution=merge-duplicates,return=representation"},
            )
            for row in resp.json():
                ids[(row["lemma"], row["pos"])] = row["id"]
        return ids

    def upload_page_files(self, book_id: str, n: int, webp: bytes, page_json: bytes) -> None:
        for ext, data, ctype in (
            ("webp", webp, "image/webp"),
            ("json", page_json, "application/json"),
        ):
            self._request(
                "upload_page",
                "POST",
                f"/storage/v1/object/pages/{book_id}/{n}.{ext}",
                content=data,
                headers={"Content-Type": ctype, "x-upsert": "true"},
            )

    def upsert_page_row(self, row: dict) -> None:
        self._request(
            "upsert_page_row",
            "POST",
            "/rest/v1/pages",
            params={"on_conflict": "book_id,number"},
            json=row,
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
        )

    def set_printed_numbers(self, book_id: str, rows: list[dict]) -> None:
        """rows: `{number, printed_number, ocr_confidence, width, height, *_path}`."""
        for row in rows:
            self.upsert_page_row({"book_id": book_id, **row})

    def update_job(self, book_id: str, **fields) -> None:
        self._patch("update_job", "jobs", {"book_id": f"eq.{book_id}"}, fields)

    def finish_book(self, book_id: str, *, page_count: int, ocr_confidence: float | None) -> None:
        self._patch(
            "finish_book",
            "books",
            {"id": f"eq.{book_id}"},
            {
                "status": "ready",
                "page_count": page_count,
                "ocr_confidence": ocr_confidence,
                "upload_path": None,
                "pipeline_version": PIPELINE_VERSION,  # RF-51
            },
        )
        self._patch(
            "finish_job",
            "jobs",
            {"book_id": f"eq.{book_id}"},
            {"status": "ready", "finished_at": _now()},
        )

    def fail_book(self, book_id: str, code: str) -> None:
        self._patch("fail_book", "books", {"id": f"eq.{book_id}"}, {"status": "error"})
        self._patch(
            "fail_job",
            "jobs",
            {"book_id": f"eq.{book_id}", "status": "in.(queued,processing)"},
            {"status": "error", "error": code, "finished_at": _now()},
        )

    # --- RF-51: actualizar en sitio libros ya procesados ---------------------------------------

    def books_to_upgrade(self, version: int) -> list[str]:
        resp = self._request(
            "books_to_upgrade",
            "GET",
            "/rest/v1/books",
            params={
                "status": "eq.ready",
                "pipeline_version": f"lt.{version}",
                "select": "id",
                "order": "created_at.asc",
                "limit": "1000",
            },
        )
        return [row["id"] for row in resp.json()]

    def list_pages(self, book_id: str) -> list[dict]:
        resp = self._request(
            "list_pages",
            "GET",
            "/rest/v1/pages",
            params={
                "book_id": f"eq.{book_id}",
                "select": "number,tokens_path",
                "order": "number.asc",
                "limit": "1000",
            },
        )
        return resp.json()

    def download_page_json(self, path: str) -> bytes:
        return self._request(
            "download_page_json", "GET", f"/storage/v1/object/pages/{path}"
        ).content

    def upload_page_json(self, path: str, data: bytes) -> None:
        self._request(
            "upload_page_json",
            "POST",
            f"/storage/v1/object/pages/{path}",
            content=data,
            headers={"Content-Type": "application/json", "x-upsert": "true"},
        )

    def set_pipeline_version(self, book_id: str, version: int) -> None:
        self._patch(
            "set_pipeline_version", "books", {"id": f"eq.{book_id}"}, {"pipeline_version": version}
        )

    def delete_upload(self, upload_path: str) -> None:
        self._request("delete_upload", "DELETE", f"/storage/v1/object/uploads/{upload_path}")

    # --- RN-11: limpieza de libros sin grupo pasados 7 días (RF-15) ---------------------------

    def expired_book_ids(self) -> list[str]:
        resp = self._request(
            "expired_books",
            "GET",
            "/rest/v1/books",
            params={"delete_after": f"lt.{_now()}", "select": "id", "limit": "200"},
        )
        return [row["id"] for row in resp.json()]

    def delete_expired_book(self, book_id: str) -> bool:
        """Borra el libro solo si sigue vencido (un grupo pudo volver a vincularlo): las páginas,
        trabajos y anotaciones caen en cascada y el diccionario personal conserva sus lemas."""
        resp = self._request(
            "delete_book",
            "DELETE",
            "/rest/v1/books",
            params={"id": f"eq.{book_id}", "delete_after": f"lt.{_now()}"},
            headers={"Prefer": "return=representation"},
        )
        return bool(resp.json())

    def delete_book_files(self, book_id: str) -> int:
        """Elimina todos los archivos de `pages/<book_id>/`; devuelve cuántos."""
        removed = 0
        while True:
            resp = self._request(
                "list_page_files",
                "POST",
                "/storage/v1/object/list/pages",
                json={"prefix": book_id, "limit": 1000, "offset": 0},
            )
            names = [f"{book_id}/{o['name']}" for o in resp.json() if o.get("name")]
            if not names:
                return removed
            self._request(
                "delete_page_files",
                "DELETE",
                "/storage/v1/object/pages",
                json={"prefixes": names},
            )
            removed += len(names)
