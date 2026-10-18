# Entrega 2b — El worker publica en Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un trabajo de GitHub Actions, dado un `book_id`, descargue el PDF subido, verifique su huella, lo procese con el pipeline existente y publique páginas, léxico y estado en Supabase (RF-12 cierre, RN-02, RN-10).

**Architecture:** Un paquete nuevo `worker/publish/` envuelve a `pipeline.process_pdf` sin cambiar su lógica: un cliente HTTP mínimo (PostgREST + Storage, service role) con transporte inyectable, una función pura que reasigna los ids de léxico locales a los de Postgres, y `run_job` que orquesta todo y siempre deja el libro en `ready` o `error`. `process_pdf` gana dos ganchos opcionales (total de hojas y página terminada) para publicar página a página. El workflow `process-book.yml` solo instala, restaura cachés y llama a `python -m publish`.

**Tech Stack:** Python 3.12, `httpx` (nuevo), PyMuPDF, pytest (con `httpx.MockTransport`), GitHub Actions, Supabase REST/Storage.

**Spec:** `docs/superpowers/specs/2026-10-18-subida-de-libros-design.md` (decisiones 4 y 5). Contexto: `docs/decisiones/ADR-002`, `ADR-003`, `docs/04-modelo-de-datos.md`.

## Global Constraints

- La service role key solo se lee de `SUPABASE_SERVICE_ROLE_KEY` (y la URL de `SUPABASE_URL`) en el entorno; nunca se escribe en archivos, registros ni mensajes de error. Claude no lee ni escribe esos valores.
- El repositorio es público (ADR-002): el registro solo lleva identificadores, números de página, conteos y tiempos; **nunca** texto OCR, títulos ni rutas de subida.
- RN-10: PDF ≤ 50 MB (ya limitado por el bucket) y **≤ 400 páginas del PDF** (hojas, no páginas lógicas); mensaje claro cuando se excede.
- RN-02: el worker recalcula el SHA-256 del archivo descargado y aborta si no coincide con `books.sha256`.
- ADR-003: solo se insertan en `lexicon` las entradas usadas por el libro.
- Plan gratuito: imágenes WebP ya ≤ 250 KB; el PDF subido se borra de `uploads` al terminar con éxito.
- Código e identificadores en inglés; textos de usuario y documentación en español. Commits en `feat/RF-11-subida-de-libros`, sin atribución de Claude (CLAUDE.md), citando el RF/RNF.
- Pruebas del worker: `./worker/run.sh uv run pytest` y `uv run ruff check` (dentro de Docker).

## Review Focus

- PDF cifrado, corrupto o con 0 páginas → el libro queda en `error` con código claro (`invalid_pdf`, `empty_book`), sin traza con contenido.
- `book_id` que no es UUID, libro inexistente o ya `ready` (dispatch repetido) → el worker no procesa nada ni falla (salida 0 o error de entrada, sin tocar otros libros).
- Dos ejecuciones para el mismo libro (doble clic en «Reintentar»): `concurrency` por libro en el workflow y el worker solo toma libros en `queued`.
- Lemas con comillas, apóstrofos o Unicode (`Ä`, `ß`, `'`) viajan como JSON, nunca en cadenas SQL ni URLs sin codificar.
- Un fallo de red transitorio (5xx, corte) no marca el libro como `error` al primer intento: reintenta con espera; un 4xx sí falla de inmediato y sin imprimir cabeceras.

---

### Task 1: Migración `jobs.pages_total`

RF-13 necesita el «Y» de «Procesando X/Y»; el worker lo conoce (hojas del PDF como estimación, páginas finales al terminar).

**Files:**

- Create: `supabase/migrations/20261018110000_total_de_paginas_del_trabajo.sql`
- Modify: `supabase/tests/` (el archivo pgTAP que ya prueba `jobs`/`book_submissions`; añadir 2 aserciones y ajustar `plan(n)`)

**Interfaces:**

- Produces: columna `public.jobs.pages_total int null check (pages_total > 0)`.

- [ ] **Step 1:** En el archivo pgTAP, añadir `has_column('public','jobs','pages_total')` y una prueba de que insertar `pages_total = 0` falla (`throws_ok ... '23514'`); subir `plan`.
- [ ] **Step 2:** Ejecutar el archivo con `execute_sql` del MCP de Supabase (termina en `rollback`). Esperado: falla (columna inexistente).
- [ ] **Step 3:** Escribir la migración (`alter table ... add column pages_total int check (pages_total > 0)`); aplicarla con `apply_migration` al proyecto `rgzguilhkilaizamvyuq`.
- [ ] **Step 4:** Re-ejecutar las tres suites pgTAP (8, 21, 22 + las nuevas). Esperado: todo `ok`.
- [ ] **Step 5:** Commit `RF-13: jobs.pages_total para mostrar el avance X/Y`.

---

### Task 2: Reasignación de ids de léxico (función pura)

**Files:**

- Create: `worker/publish/__init__.py` (vacío), `worker/publish/remap.py`
- Test: `worker/tests/test_publish_remap.py`

**Interfaces:**

- Produces:
  - `remap_page(page: dict, mapping: dict[int, int]) -> dict` — devuelve una copia profunda donde cada `tokens[i]["l"]` y cada clave de `lex` pasan de id local a id de Postgres (las claves de `lex` como `str`); lanza `KeyError` si falta un id; no muta la entrada.
  - `lexicon_row(entry: dict) -> dict` — de una entrada del registro (`lemma`, `pos`, `g`, `pl`, `senses`) a la fila de `public.lexicon`: `{"lemma","pos","genders","plural","senses","source":"wiktionary"}` (`g` ausente → `[]`, `pl` ausente → `None`).

- [ ] **Step 1: tests** — `test_remap_rewrites_token_ids_and_lex_keys` (mapping `{1: 501, 2: 77}`; token `l: 1` → `501`, `lex` claves `"501"`,`"77"`), `test_remap_does_not_mutate_input`, `test_remap_missing_id_raises_keyerror`, `test_remap_result_still_validates` (la salida pasa `validate_page`), `test_lexicon_row_defaults` (sin `g`/`pl`), `test_lexicon_row_keeps_unicode_lemma` (`"Äpfel'ß"` intacto).
- [ ] **Step 2:** `./worker/run.sh uv run pytest tests/test_publish_remap.py -v` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar ambas funciones en `remap.py`.
- [ ] **Step 4:** Mismo comando → PASS; `uv run ruff check`.
- [ ] **Step 5:** Commit `RF-12: reasignación de ids de léxico locales a los de Postgres`.

---

### Task 3: Cliente de Supabase (REST + Storage)

**Files:**

- Modify: `worker/pyproject.toml` (añadir `"httpx>=0.27"` a `dependencies`), `worker/uv.lock` (`uv lock`)
- Create: `worker/publish/client.py`
- Test: `worker/tests/test_publish_client.py`

**Interfaces:**

- Produces: `class SupabaseError(Exception)` (solo código de estado y operación en el mensaje) y
  `class Supabase`:
  - `__init__(self, url: str, service_key: str, *, transport: httpx.BaseTransport | None = None, sleep=time.sleep)`
  - `get_book(self, book_id: str) -> dict | None` (`id, sha256, status, upload_path`)
  - `claim_book(self, book_id: str) -> bool` — `PATCH books?id=eq.X&status=eq.queued` → `processing` con `Prefer: return=representation`; `True` solo si cambió una fila; además pone `jobs.status='processing'`, `started_at=now` para el trabajo `queued` de ese libro.
  - `download_upload(self, upload_path: str, dest: Path) -> None` (streaming a disco, `GET /storage/v1/object/uploads/<path>`)
  - `upsert_lexicon(self, rows: list[dict]) -> dict[tuple[str, str], int]` — lotes de 500, `POST lexicon?on_conflict=lemma,pos` con `Prefer: resolution=merge-duplicates,return=representation`; devuelve `{(lemma,pos): id}`.
  - `upload_page_files(self, book_id: str, n: int, webp: bytes, page_json: bytes) -> None` — `POST /storage/v1/object/pages/<book>/<n>.webp|.json` con `x-upsert: true` y tipos `image/webp`, `application/json`.
  - `upsert_page_row(self, row: dict) -> None` (`pages`, `on_conflict=book_id,number`)
  - `update_job(self, book_id: str, **fields) -> None` (campos `pages_done`, `pages_total`, `status`, `error`, `finished_at`)
  - `finish_book(self, book_id: str, *, page_count: int, ocr_confidence: float | None) -> None` (libro y trabajo a `ready`, `finished_at`)
  - `fail_book(self, book_id: str, code: str) -> None` (libro `error`, trabajo `error` con `error=code`)
  - `delete_upload(self, upload_path: str) -> None`
  - `set_printed_numbers(self, book_id: str, rows: list[dict]) -> None` (upsert de `number, printed_number, ocr_confidence` — reutiliza `upsert_page_row`).
- Reintentos: 3 intentos con espera 1 s, 2 s ante `httpx.TransportError` y 5xx; 4xx falla de inmediato con `SupabaseError(f"{op}: HTTP {status}")`.

- [ ] **Step 1: tests con `httpx.MockTransport`** — `test_headers_use_service_key_for_apikey_and_bearer`; `test_claim_book_true_only_when_a_row_changes` (respuesta `[]` → `False`); `test_upsert_lexicon_maps_lemma_pos_to_id_in_batches_of_500` (1 200 filas → 3 peticiones); `test_lexicon_body_is_json_with_quotes_and_unicode` (lema `"Ä'ß\""` llega intacto en el cuerpo); `test_retries_5xx_then_succeeds` (sleep falso registra 1 y 2); `test_4xx_fails_immediately_without_leaking_key` (`service_key` no aparece en `str(exc)` ni en `repr`); `test_upload_sends_upsert_header_and_content_type`; `test_download_streams_to_file`.
- [ ] **Step 2:** `./worker/run.sh uv run pytest tests/test_publish_client.py -v` → FAIL.
- [ ] **Step 3:** Implementar `Supabase` con un `httpx.Client` (`base_url`, cabeceras `apikey` y `Authorization: Bearer`, `timeout=60`); un método privado `_request(op, ...)` concentra reintentos y errores. Codificar parámetros de consulta con `params=` (no concatenar).
- [ ] **Step 4:** PASS + `ruff check`.
- [ ] **Step 5:** Commit `RF-12: cliente de Supabase del worker (REST y Storage)`.

---

### Task 4: Ganchos en `process_pdf`

**Files:**

- Modify: `worker/pipeline/run.py` (`process_pdf`, `_process_page`)
- Test: `worker/tests/test_run.py` (añadir)

**Interfaces:**

- Produces: `process_pdf(..., on_start: Callable[[int], None] | None = None, on_page: Callable[[int, Path], None] | None = None)`. `on_start(sheets)` se llama una vez con `len(doc)` antes de la primera hoja; `on_page(n, pages_dir)` se llama tras terminar la página `n` (JSON ya escrito), **también** para páginas omitidas por reanudación. Sin ganchos el comportamiento no cambia.
- Cambio de compatibilidad: ninguno para `main()`.

- [ ] **Step 1: tests** (con el `pdf` y los fakes que ya existen en el archivo) — `test_on_start_receives_sheet_count` (3 hojas → `3`), `test_on_page_called_for_every_logical_page_in_order` (`[1,2,3,4]`, y que `pages_dir/f"{n}.json"` existe al llamarse), `test_on_page_called_for_skipped_pages_on_resume` (segunda ejecución sobre la misma carpeta llama a los 4), `test_hook_exception_marks_progress_error` (si `on_page` lanza, `progress.json` queda `error` y se propaga).
- [ ] **Step 2:** `./worker/run.sh uv run pytest tests/test_run.py -v` → los nuevos FALLAN.
- [ ] **Step 3:** Añadir los dos parámetros; llamar a `on_page` en ambos caminos (omitida y procesada) dentro del `try` existente.
- [ ] **Step 4:** Toda la suite del worker en PASS + ruff.
- [ ] **Step 5:** Commit `RF-12: ganchos de avance en process_pdf para publicar página a página`.

---

### Task 5: Orquestación `run_job`

**Files:**

- Create: `worker/publish/job.py`
- Test: `worker/tests/test_publish_job.py`

**Interfaces:**

- Consumes: `Supabase` (Task 3), `remap_page`/`lexicon_row` (Task 2), `process_pdf` con ganchos (Task 4), `LexRegistry.to_dict()` (`{"ids": {"lemma|pos": local_id}, "entries": {"local_id": entry}}`).
- Produces:
  - `MAX_PDF_PAGES = 400`
  - `run_job(book_id: str, client, *, workdir: Path, lex, nlp, translator, engine=None, log=None) -> str` — devuelve `"done"`, `"skipped"` (libro inexistente o no `queued`) o lanza tras dejar el libro en `error` (código en `books`/`jobs`, nunca texto del libro).
  - Códigos de error: `invalid_book_id`, `hash_mismatch`, `invalid_pdf`, `too_many_pages`, `empty_book`, `processing_failed`, `publish_failed`.

Flujo de `run_job`: validar UUID (`invalid_book_id` sin tocar la base) → `get_book`; `None` o `status != 'queued'` → `"skipped"` → `claim_book` (False → `"skipped"`) → `download_upload` → SHA-256 en streaming vs `book["sha256"]` (`hash_mismatch`) → abrir con PyMuPDF: cifrado/ilegible → `invalid_pdf`; `len(doc) > MAX_PDF_PAGES` → `too_many_pages`; `len(doc) == 0` → `empty_book` → `process_pdf(..., on_start, on_page)` donde `on_start` hace `update_job(pages_total=hojas)` y `on_page` (a) lee el JSON local, (b) `upsert_lexicon` solo de los ids locales que falten en un `mapping` en memoria, (c) `remap_page`, (d) `upload_page_files` + `upsert_page_row` (`image_path=f"{book}/{n}.webp"`, `tokens_path=f"{book}/{n}.json"`, ancho/alto/confianza desde `n.meta.json`), (e) `update_job(pages_done=n)` → al terminar: leer `manifest.json`, `set_printed_numbers`, `update_job(pages_total=páginas finales)`, `finish_book(page_count, ocr_confidence=summary.mean_confidence)`, `delete_upload`, y vaciar el PDF del disco. Cualquier excepción → `fail_book(código)` y se relanza; el registro lleva solo `type(exc).__name__` y números de página.

- [ ] **Step 1: tests** con un `FakeClient` en memoria (registra llamadas), un PDF sintético y `Engine`/léxico/traductor falsos como en `test_run.py` — `test_success_publishes_all_pages_and_marks_ready` (páginas 1–4 subidas, `pages_done` termina en 4, `finish_book(page_count=4)`, `delete_upload` llamado); `test_lexicon_ids_in_published_json_are_postgres_ids` (el FakeClient asigna ids ≥ 1000 y el JSON subido solo contiene esos ids y valida con `validate_page`); `test_lexicon_upserted_once_per_entry_across_pages`; `test_printed_numbers_set_from_manifest`; `test_hash_mismatch_fails_with_code_and_keeps_upload`; `test_too_many_pages_rejected_before_processing` (parchear `MAX_PDF_PAGES=2`; `process_pdf` no se invoca); `test_encrypted_or_garbage_pdf_is_invalid_pdf`; `test_empty_book_when_no_pages`; `test_skips_when_book_missing_or_not_queued` (no se llama a `claim_book`); `test_claim_lost_returns_skipped`; `test_invalid_uuid_never_touches_client`; `test_processing_failure_marks_error_and_logs_no_ocr_text` (con `caplog`, el texto «Haus» no aparece); `test_publish_error_marks_publish_failed`.
- [ ] **Step 2:** `./worker/run.sh uv run pytest tests/test_publish_job.py -v` → FAIL.
- [ ] **Step 3:** Implementar `run_job` en `job.py` (funciones privadas pequeñas: `_sha256(path)`, `_open_checked(path)`, `_publish_page(...)`). El `mapping` local→Postgres se construye con `{local_id: pg_id}` consultando `registry`: leer `out/lexicon.json` tras cada página (ya lo escribe `process_pdf` antes de `on_page`).
- [ ] **Step 4:** Suite completa del worker en PASS + ruff.
- [ ] **Step 5:** Commit `RF-12: run_job publica páginas, léxico y estado verificando la huella (RN-02, RN-10)`.

---

### Task 6: Punto de entrada y workflow

**Files:**

- Create: `worker/publish/__main__.py`, `.github/workflows/process-book.yml`
- Test: `worker/tests/test_publish_main.py`
- Modify: `.env.example` (comentario: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` también como secretos de GitHub Actions; `GITHUB_DISPATCH_TOKEN` solo en Vercel)

**Interfaces:**

- Produces: `python -m publish --book-id <uuid> --lexicon <ruta.sqlite>`; `main(argv, env) -> int` (0 = `done`/`skipped`, 1 = error). Falta de `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` → mensaje sin valores y código 2. Sin `--no-translate`: usa `ArgosTranslator`.

**Workflow `process-book.yml`:**

- Disparadores: `repository_dispatch` (`types: [process-book]`, `client_payload.book_id`) y `workflow_dispatch` (input `book_id`, para reintentos manuales).
- `concurrency: { group: process-book-${{ github.event.client_payload.book_id || inputs.book_id }}, cancel-in-progress: false }` (un grupo por libro: no se pierden libros de otros usuarios en la cola).
- `permissions: { contents: read }`; `timeout-minutes: 300`.
- El `book_id` se pasa **por variable de entorno** (`BOOK_ID: ${{ ... }}`) y un paso valida `^[0-9a-f-]{36}$` antes de usarlo (nunca interpolado en `run:`).
- Pasos: checkout → `sudo apt-get install -y tesseract-ocr tesseract-ocr-deu` → `astral-sh/uv` fijado por versión → `actions/cache` para el léxico (`worker/.local/lexicon.sqlite`, clave con `hashFiles('worker/lexicon/build.py')`) y para el modelo de Argos → si no hay caché: descargar `https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl.gz` y `python -m lexicon.build` → `uv sync --extra argos` → `python -m lexicon.translate provision` (usa la huella fijada) → `python -m publish`. Los secretos solo en el `env:` del último paso. Sin `set -x` y sin subir artefactos.

- [ ] **Step 1: tests** — `test_main_requires_env_without_echoing_values`, `test_main_rejects_bad_uuid_with_exit_1`, `test_main_exit_0_on_skipped` (con `run_job` parcheado).
- [ ] **Step 2:** `./worker/run.sh uv run pytest tests/test_publish_main.py -v` → FAIL.
- [ ] **Step 3:** Implementar `__main__.py` (carga `spacy.load("de_core_news_md")` y `Lexicon` solo si el UUID es válido; `workdir` temporal).
- [ ] **Step 4:** PASS. Validar el YAML con `actionlint` si está disponible (si no, revisar a mano y decirlo en el reporte).
- [ ] **Step 5:** Commit `RF-12: process-book.yml y punto de entrada del worker (ADR-002)`.

---

### Task 7: Documentación y verificación real

**Files:**

- Modify: `docs/04-modelo-de-datos.md` (`image_path`/`tokens_path` son rutas **relativas al bucket** `pages`: `<book_id>/<n>.webp`; columna `jobs.pages_total`), `docs/requisitos/funcionales/RF-12-procesar-libro-en-segundo-plano.md` (verificación entrega 2b: qué criterios quedan ✅ y cuáles sin verificar), `docs/requisitos/INDEX.md` si cambia algún estado, `docs/ESTADO.md` (2b hecha; siguiente 2c; qué falta verificar).

- [ ] **Step 1:** Ejecutar la suite completa (`./worker/run.sh uv run pytest`, `uv run ruff check`) y `pnpm typecheck && pnpm lint && pnpm test:quick`. Esperado: todo en verde.
- [ ] **Step 2: humo real (lo corre la usuaria o con su permiso explícito)** — sin 2c no hay API que cree el libro, así que: subir `samples/Der Schatz-3-7.pdf` a `uploads/<su uid>/` desde el panel de Supabase, y pedir a Claude que cree la solicitud y llame a `finalize_submission` con la huella del archivo vía `execute_sql`; luego lanzar `workflow_dispatch` con ese `book_id`. Esperado: libro `ready`, 10 filas en `pages`, 20 objetos en `pages/<book_id>/`, `pages_done = pages_total = 10`, PDF borrado de `uploads`, y el registro del Action sin texto del libro. Anotar el tiempo para RNF-04.
- [ ] **Step 3:** Si el humo no se puede correr, dejarlo escrito en ESTADO y RF-12 como «sin verificar», no como hecho.
- [ ] **Step 4:** Commit `RF-12: documentación y estado tras la entrega 2b`.

---

## Self-review (hecha)

- **Cobertura del spec:** decisión 4 (huella + >400 páginas) → Task 5; decisión 5 (WebP/JSON en `pages/<book>/`, filas de `pages`, `jobs.pages_done`, mapeo a `lexicon.id`, solo léxico usado) → Tasks 2, 3, 5; workflow con `repository_dispatch` y `book_id` → Task 6. `pages_total` (Task 1) es adición mía para RF-13. La reanudación es _idempotente_, no incremental: tras un fallo el trabajo reprocesa desde la hoja 1 (runner nuevo, sin caché de OCR) y vuelve a subir con `x-upsert`; es una decisión del plan, a confirmar con la usuaria si importa el tiempo en libros largos.
- **Consistencia de tipos:** `Supabase.*`, `remap_page`, `lexicon_row`, `run_job`, `MAX_PDF_PAGES` y los ganchos `on_start/on_page` tienen la misma firma en todas las tareas.
- **Proporción:** tareas sin cuerpos de código; solo firmas, pruebas y valores fijados.
