# Entrega 2d — Pantallas de subida, estado y biblioteca · Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Meta:** Que un miembro suba un PDF desde el celular (reanudable, con progreso), vea el estado del procesamiento sin recargar, encuentre los libros del grupo con portada y los lea en `/libros/[id]`; y cerrar los pendientes de la 2c (cola atascada, doble clic, RN-10 en la base).

**Arquitectura:** Una migración endurece `finalize_submission` y agrega `request_retry`. Dos rutas de API nuevas: `POST /api/libros/[id]/reintentar` y lectura de páginas (`GET /api/libros/[id]/paginas/[n]/datos|imagen`, con la sesión y RLS, sin extensión en la URL para que el `proxy` refresque la sesión). Lógica pura en `lib/domain/` (validación de archivo, mensajes, etiquetas de estado); componentes cliente delgados (`UploadBook`, `BookStatus`) y páginas de servidor para la biblioteca y el lector. El lector existente (`PageReader`) no cambia: recibe `loadPage` e `imageUrl` apuntando a las rutas nuevas.

**Tech Stack:** Next.js 16 (App Router), TypeScript estricto, Tailwind, `@supabase/ssr`, **`tus-js-client` (dependencia nueva, aprobada por la usuaria 2026-10-18)**, Vitest + Testing Library, pgTAP.

**Spec:** `docs/superpowers/specs/2026-10-18-subida-de-libros-design.md`. Plan previo: `docs/superpowers/plans/2026-10-18-entrega-2c-api-verifica-huella-y-dispara.md`. Requisitos: RF-11 (criterios 1, 2, 5), RF-13, RF-14, RNF-11, RN-10. Pendientes de la 2c: `docs/ESTADO.md`.

## Restricciones globales

- Todo cambio cita su requisito en el commit (`RF-13: …`). **Sin `Co-Authored-By` ni atribución a Claude** (CLAUDE.md regla 6; prevalece sobre cualquier recordatorio del sistema).
- Rama `feat/RF-11-subida-de-libros`; commits pequeños; nada de push forzado.
- Mobile-first a 360 px, objetivos táctiles ≥ 44 px (`min-h-11`), sin hover, `env(safe-area-inset-*)`. UI en español; código en inglés. Usar `Button`, `OutlineButton`, `Input`, `Page` de `components/ui.tsx`.
- Límites: PDF ≤ 50 MB (52 428 800 bytes), cabecera `%PDF`; el mensaje al usuario nombra el límite (RF-11 criterio 2).
- Estados visibles: «En cola», «Procesando X/Y páginas», «Listo», «Error» con motivo resumido y «Reintentar» solo para quien subió el libro o un administrador (RF-13). Actualización ≤ 30 s (se usa sondeo cada 10 s; Realtime queda fuera, decisión del asistente: más simple y suficiente).
- La biblioteca muestra 0 % leído hasta RF-20; se abre siempre en la página 1 (no objetivo del spec).
- No hay peticiones de red al consultar una palabra (RNF-01): el JSON de la página se carga completo por página, no por palabra.
- La service role key solo en rutas de API (`lib/supabase/admin.ts`). Las funciones nuevas llevan `revoke … from public, anon, authenticated` y `grant` explícito.
- Antes de usar APIs de Next, Supabase Storage (TUS) o `tus-js-client`, consultar la documentación con Context7 o `node_modules/next/dist/docs/` (CLAUDE.md).
- El navegador nunca recibe `upload_path` de otras personas ni claves.

## Enfoque de revisión (casos que el spec no nombra)

1. **Se corta la conexión a mitad de subida** (iPhone con la pantalla bloqueada): al reabrir, la subida continúa desde el avance guardado (`findPreviousUploads`) y no crea una segunda solicitud.
2. **Título vacío, solo espacios o de 201 caracteres; archivo de 0 bytes; PDF renombrado `.pdf` que es otra cosa** → mensaje claro antes de subir; nada llega a Storage.
3. **Doble toque en «Subir» / «Reintentar»** → una sola solicitud/un solo job; el segundo toque no muestra error confuso.
4. **Libro en «Error» visto por alguien que no lo subió y no es administrador** → ve el motivo pero no «Reintentar»; la API responde 403 aunque llame directamente.
5. **Libro «Procesando» abierto en el lector con 0 páginas publicadas, o página aún no publicada** → mensaje «Esta página aún se está procesando», sin pantalla rota.

---

### Tarea 1: Migración — cola sin atascos y reintento (cierra pendientes de la 2c)

**Archivos:**

- Crear: `supabase/migrations/20261018120000_cola_sin_atascos.sql`
- Crear: `supabase/tests/cola_sin_atascos.test.sql` (pgTAP, termina en `rollback`; mismo estilo que `supabase/tests/book_submissions.test.sql`)
- Modificar: `lib/supabase/database.types.ts` (regenerar con el MCP de Supabase `generate_typescript_types`; mantener el formato Prettier existente)

**Interfaces:**

- Produce (SQL, todas `security definer set search_path = ''`):
  - índice único parcial `jobs_one_active_per_user on public.jobs (requested_by) where status in ('queued','processing')` (RN-10 en la base).
  - `finalize_submission(p_submission uuid, p_sha256 text) returns jsonb` reemplazada con los mismos permisos (solo `service_role`): (a) si la solicitud ya no está `pending` devuelve `{"rejected":"not_pending"}` en lugar de lanzar; (b) inserta el libro con `on conflict (sha256) do nothing` y vuelve a leerlo; (c) si el insert de `jobs` viola el índice único devuelve `{"rejected":"busy"}` (captura `unique_violation`, deja la solicitud `rejected` con `error='busy'`). El resto del contrato igual: `{book_id, job_id?, reused, status, upload_path}` o `{rejected}`.
  - `request_retry(p_book uuid) returns jsonb` (ejecutable por `authenticated`): exige sesión; el libro debe ser legible (`can_read_book`); quien llama es `books.uploaded_by` o administrador de algún grupo que tiene el libro; el libro debe estar en `error`, o `queued` con su último job creado hace más de 5 minutos sin `started_at` (disparo perdido); debe conservar `upload_path`; quien llama no puede tener otro job activo (`busy`). Crea un job nuevo (`requested_by = uid`), deja `books.status='queued'` y devuelve `{"book_id":…, "job_id":…}`. Errores con `raise exception` y códigos estables: `not_authenticated` (28000), `forbidden` (42501), `not_retryable` (P0001), `busy` (P0001), `upload_missing` (P0002).

- [ ] **Paso 1: escribir la prueba pgTAP que falla** (usa `execute_sql` del MCP; no hay CLI). Casos mínimos: (a) segunda llamada a `finalize_submission` con el mismo id → `{rejected: not_pending}`; (b) dos jobs activos del mismo usuario → el insert directo falla por el índice; (c) `request_retry` por un miembro que no subió el libro ni es administrador → `forbidden`; (d) por quien lo subió con libro en `error` → crea job y deja `queued`; (e) libro `ready` → `not_retryable`; (f) libro `queued` con job de hace 1 minuto → `not_retryable`, con job de hace 10 minutos sin `started_at` → ok; (g) usuario con otro job activo → `busy`; (h) `anon`/`authenticated` no pueden ejecutar `finalize_submission`. Ejecutarla → FALLA (las funciones no existen).
- [ ] **Paso 2: escribir la migración** con las firmas de arriba. Mantener todo lo ya cubierto por `supabase/tests/book_submissions.test.sql` (21/21) y `rls.test.sql`.
- [ ] **Paso 3: aplicar la migración al proyecto real `rgzguilhkilaizamvyuq`** con `apply_migration` (como en 2a/2b) y ejecutar las tres pruebas pgTAP (`book_submissions`, `rls`, la nueva) → todas pasan. Las de `rls.test.sql` asumen que no hay grupos ni libros reales.
- [ ] **Paso 4:** regenerar `lib/supabase/database.types.ts`; `pnpm typecheck` → sin errores.
- [ ] **Paso 5: commit** `RN-10: un trabajo activo por usuario en la base, finalize idempotente y request_retry (RF-13)`.

### Tarea 2: API de reintento y cierre del hueco `not_pending`

**Archivos:**

- Modificar: `lib/server/finalize-submission.ts` (+ su prueba): `rejected: "not_pending"` → `{ ok:false, code:"not_pending" }` (HTTP 409 en la ruta; el objeto subido **no** se borra porque otra petición lo está usando).
- Modificar: `app/api/libros/finalizar/route.ts` (+ prueba): mapear `not_pending` → 409.
- Crear: `app/api/libros/[id]/reintentar/route.ts`
- Prueba: `app/api/libros/[id]/reintentar/route.test.ts`

**Interfaces:**

- Consume: `dispatchProcessBook` (2c), `createClient`, `createAdminClient`, RPC `request_retry` (tarea 1).
- Produce: `POST /api/libros/[id]/reintentar` (sin cuerpo). 200 `{ book_id, job_id }`; 400 `invalid_request` (id no UUID); 401 `not_authenticated`; 403 `forbidden`; 409 `not_retryable`; 409 `upload_missing`; 429 `busy`; 502 `dispatch_failed` con `book_id` (el job queda creado: un nuevo toque sobre «Reintentar» vuelve a disparar tras 5 min, ver `request_retry`); 500 `unexpected`. La RPC se llama con el **cliente con sesión** (para que valga `auth.uid()`); el disparo usa `dispatchProcessBook` con las variables de la 2c. Sin `maxDuration` especial.

- [ ] **Paso 1: pruebas que fallan.** finalize: el RPC devuelve `{rejected:"not_pending"}` → `{ok:false, code:"not_pending"}` y `deleteUpload` NO se llamó. Ruta finalizar: `not_pending` → 409. Ruta reintentar (mocks de Supabase y dispatch): sin sesión 401; id inválido 400; cada código de error de la RPC → su HTTP (`forbidden` 403, `not_retryable` 409, `upload_missing` 409, `busy` 429); éxito → llama a `dispatchProcessBook(book_id)` y responde 200; dispatch lanza `DispatchError` → 502 con `book_id`; el cuerpo de error nunca incluye el mensaje crudo de Postgres.
- [ ] **Paso 2:** `pnpm vitest run lib/server app/api` → FALLA.
- [ ] **Paso 3: implementar** (la traducción de errores de Postgres a códigos usa `error.message` exacto de los `raise exception` de la tarea 1; cualquier otro → `unexpected`).
- [ ] **Paso 4:** mismo comando → PASA; `pnpm typecheck && pnpm lint`.
- [ ] **Paso 5: commit** `RF-13: POST /api/libros/[id]/reintentar y not_pending idempotente en finalizar`.

### Tarea 3: Dominio puro — validación de archivo, mensajes y estado

**Archivos:**

- Crear: `lib/domain/upload.ts`, `lib/domain/book-status.ts`
- Pruebas: `lib/domain/upload.test.ts`, `lib/domain/book-status.test.ts`

**Interfaces:**

- Produce en `upload.ts`:
  ```ts
  export const MAX_UPLOAD_BYTES = 52_428_800;
  export const MAX_TITLE_LENGTH = 200;
  export function validateTitle(
    raw: string,
  ): { ok: true; title: string } | { ok: false; message: string };
  export function validatePdfFile(file: {
    size: number;
    head: Uint8Array;
  }): { ok: true } | { ok: false; message: string };
  export function apiErrorMessage(code: string): string; // códigos de /api/libros/finalizar y /reintentar → español
  ```
  `validateTitle` recorta espacios y exige 1–200 caracteres. `validatePdfFile` rechaza tamaño 0 («El archivo está vacío»), > 50 MB («El PDF supera el límite de 50 MB. Comprímelo y vuelve a intentarlo»), y cabecera distinta de `%PDF` («El archivo no es un PDF»). `apiErrorMessage("busy")` = «Espera a que termine tu libro actual» (texto exacto del RF-11 criterio 4); códigos `not_pdf`, `too_large`, `upload_missing`, `forbidden`, `dispatch_failed`, `not_retryable`, `not_pending`, `unexpected` y cualquier desconocido tienen mensaje propio (el desconocido: «No se pudo completar. Inténtalo de nuevo»).
- Produce en `book-status.ts`:

  ```ts
  export type BookStatusInput = {
    bookStatus: string;
    jobStatus: string | null;
    pagesDone: number;
    pageCount: number | null;
    error: string | null;
  };
  export function describeStatus(i: BookStatusInput): {
    label: string;
    tone: "pending" | "working" | "ready" | "error";
    progress: number | null;
  };
  export function canRetry(i: {
    status: string;
    uploadedBy: string | null;
    userId: string;
    isAdmin: boolean;
  }): boolean;
  export function summarizeError(raw: string | null): string; // código del worker → frase corta en español; nunca devuelve más de 120 caracteres ni texto crudo desconocido
  ```

  Etiquetas exactas: «En cola», «Procesando 12/200 páginas» (sin total: «Procesando 12 páginas…»), «Listo», «Error». `progress` en 0–1 solo cuando hay total.

- [ ] **Paso 1: pruebas que fallan** con los textos exactos de arriba: título `"  Der Schatz  "` → `"Der Schatz"`; `""`, `"   "` y 201 caracteres → error; archivo de 0, 50 MB + 1 byte y cabecera `GIF8` → mensajes; 50 MB exactos y `%PDF` → ok; cada código → su mensaje; `describeStatus` para queued/processing con y sin total/ready/error; `canRetry` solo si `status === "error"` (o `queued` atascado lo decide el servidor, el cliente solo oculta si no es dueño ni administrador); `summarizeError("book_too_long")` y un texto desconocido de 500 caracteres.
- [ ] **Paso 2:** `pnpm vitest run lib/domain/upload.test.ts lib/domain/book-status.test.ts` → FALLA.
- [ ] **Paso 3: implementar.** Los códigos de error del worker salen de `worker/publish/job.py` (`JobError.code`); leerlos de ahí, no inventarlos.
- [ ] **Paso 4:** mismo comando → PASA.
- [ ] **Paso 5: commit** `RF-11: validación de archivo y título, mensajes de error y etiquetas de estado (RNF-11, RF-13)`.

### Tarea 4: Rutas de lectura de páginas (JSON e imagen) con RLS

**Archivos:**

- Crear: `app/api/libros/[id]/paginas/[n]/datos/route.ts`, `app/api/libros/[id]/paginas/[n]/imagen/route.ts`
- Prueba: `app/api/libros/[id]/paginas/[n]/paginas.test.ts`

**Interfaces:**

- Consume: `createClient()` (sesión); tabla `pages` (`image_path`, `tokens_path`) y bucket `pages` (políticas `pages_read` ya permiten leer a quien puede leer el libro).
- Produce: `GET …/datos` → 200 JSON de la página (cuerpo tal cual de Storage, `content-type: application/json`); `GET …/imagen` → 200 `image/webp`. Ambas: `Cache-Control: private, max-age=3600`; 400 si `id` no es UUID o `n` no es entero 1–400; 401 sin sesión; 404 si la fila de `pages` no existe (aún no publicada) o RLS no la deja ver (mismo código, sin distinguir). Streaming del cuerpo; nunca devuelven rutas de Storage.

- [ ] **Paso 1: pruebas que fallan** (mocks de Supabase): `n` = `0`, `401`, `abc`, `1.5` → 400; id inválido → 400; sin sesión → 401; fila inexistente → 404; fila y objeto → 200 con las cabeceras exactas; objeto faltante en Storage → 404; el cuerpo de la respuesta de `datos` no contiene el `tokens_path`.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3: implementar** con `supabase.storage.from("pages").download(path)` y `data.stream()` (la lectura es con la sesión de la persona, no con la service role: RLS aplica también al objeto).
- [ ] **Paso 4:** ejecutar → PASA; `pnpm typecheck`.
- [ ] **Paso 5: commit** `RF-14: rutas que sirven JSON e imagen de página con la sesión (RN-03, RNF-06)`.

### Tarea 5: Pantalla de subida reanudable

**Archivos:**

- Modificar: `package.json` / `pnpm-lock.yaml` (`pnpm add tus-js-client`, versión exacta de al menos dos semanas de antigüedad)
- Crear: `components/upload-book.tsx` (cliente), `lib/upload/resumable.ts` (envoltura de TUS)
- Pruebas: `components/upload-book.test.tsx`, `lib/upload/resumable.test.ts`

**Interfaces:**

- Consume: `validateTitle`, `validatePdfFile`, `apiErrorMessage` (tarea 3); `createClient()` de `lib/supabase/client.ts`; RPC `submit_book(p_group, p_title, p_upload_path)`; `POST /api/libros/finalizar`.
- Produce en `resumable.ts`:
  ```ts
  export type UploadHandle = { start(): void; abort(): Promise<void> };
  export function startResumableUpload(args: {
    file: File;
    objectName: string;
    accessToken: string;
    supabaseUrl: string;
    onProgress(sent: number, total: number): void;
    onSuccess(): void;
    onError(err: Error): void;
  }): UploadHandle;
  ```
  Usa `tus-js-client` contra `${supabaseUrl}/storage/v1/upload/resumable` con `bucketName: "uploads"`, `contentType: "application/pdf"`, trozos de 6 MB (requisito de Supabase), reintentos `[0, 3000, 5000, 10000, 20000]`, `removeFingerprintOnSuccess: true`, y al iniciar llama a `findPreviousUploads()` y reanuda el primero si existe.
- Produce `UploadBook({ groupId }: { groupId: string })`: campos «Título» y archivo (`accept="application/pdf"`), botón «Subir libro» (deshabilitado mientras sube o procesa), barra con `role="progressbar"` y `aria-valuenow`, botón «Cancelar». Flujo: valida título y archivo (primeros 5 bytes con `file.slice(0,5).arrayBuffer()`) → `objectName = "<uid>/<crypto.randomUUID()>.pdf"` → sube → `submit_book` → `POST /api/libros/finalizar` → `router.refresh()`. Los errores se muestran con `apiErrorMessage`; `busy` muestra «Espera a que termine tu libro actual». El `objectName` se guarda en `sessionStorage`/`localStorage` (con `try/catch`) para que, tras recargar, el mismo archivo reanude con el mismo nombre.

- [ ] **Paso 1: pruebas que fallan.** `resumable`: con `tus-js-client` simulado, `findPreviousUploads` devuelve un avance previo → se llama a `resumeFromPreviousUpload`; los parámetros fijos (endpoint, `bucketName`, `contentType`, `chunkSize` 6 MiB, `Authorization: Bearer <token>`) llegan a `new tus.Upload`. Componente (Supabase y `startResumableUpload` simulados): título vacío → mensaje y no se llama a Storage; archivo de otro tipo/vacío/de 51 MB → mensaje y no se sube; flujo feliz llama en orden `startResumableUpload` → `rpc("submit_book")` → `fetch("/api/libros/finalizar")`; `busy` del API muestra el texto exacto; doble toque en «Subir libro» llama a `submit_book` una sola vez; el botón y los campos quedan deshabilitados mientras sube; la barra refleja `onProgress`.
- [ ] **Paso 2:** `pnpm vitest run lib/upload components/upload-book.test.tsx` → FALLA.
- [ ] **Paso 3: implementar** (consultar la guía de subida reanudable de Supabase con Context7 antes de fijar cabeceras y metadatos).
- [ ] **Paso 4:** mismo comando → PASA; `pnpm typecheck && pnpm lint`.
- [ ] **Paso 5: commit** `RF-11: subida reanudable con TUS, validación previa y progreso (RF-11 c2 y c5, RNF-11)`.

### Tarea 6: Biblioteca del grupo con estado en vivo

**Archivos:**

- Crear: `components/book-status.tsx` (cliente), `components/book-card.tsx`
- Modificar: `app/grupos/[id]/page.tsx` (sección «Libros»)
- Pruebas: `components/book-status.test.tsx`, `components/book-card.test.tsx`

**Interfaces:**

- Consume: `describeStatus`, `canRetry`, `summarizeError` (tarea 3); `POST /api/libros/[id]/reintentar` (tarea 2); tablas `group_books`, `books`, `jobs` por RLS.
- Produce `BookStatus({ bookId, initial, canRetry }: { bookId: string; initial: BookStatusInput; canRetry: boolean })`: muestra etiqueta, barra con `role="progressbar"` si hay total, motivo resumido en error y «Reintentar» (≥ 44 px) solo si `canRetry`. Sondea cada 10 s con el cliente de navegador (`books` + último `jobs`) mientras el estado sea `queued`/`processing`; se detiene en `ready`/`error`; llama a `router.refresh()` cuando cambia `pagesDone` o el estado; limpia el intervalo al desmontar.
- Produce `BookCard`: portada (`<img loading="lazy" src="/api/libros/<id>/paginas/1/imagen">`, `alt=""`, caja con relación de aspecto fija para no saltar el diseño; si la página 1 aún no existe, cuadro con la inicial del título), título, «N páginas» cuando `page_count` existe, «0 % leído» (RF-20 pendiente), `BookStatus`, y enlace a `/libros/<id>` mientras haya al menos una página publicada (RF-13 c2) o el libro esté listo.
- La página del grupo: consulta `group_books` → `books` con el cliente del servidor (RLS filtra, RN-03), el último `jobs` por libro, `uploaded_by`, el rol del usuario (`group_members`) para `canRetry`, y muestra `UploadBook` encima de la lista (solo miembros: ya lo son si ven la página). Orden: más recientes primero. Lista vacía: «Aún no hay libros en este grupo.»

- [ ] **Paso 1: pruebas que fallan** (Supabase y `fetch` simulados, temporizadores falsos de Vitest): `BookStatus` con `processing 12/200` muestra «Procesando 12/200 páginas» y `aria-valuenow`; avanza el reloj 10 s → se consulta y se actualiza; al llegar a `ready` deja de consultar (el reloj avanza 60 s y no hay más llamadas); error → motivo resumido y «Reintentar» solo con `canRetry`; tocar «Reintentar» dos veces seguidas hace una sola llamada y mientras tanto el botón está deshabilitado; `429 busy` muestra «Espera a que termine tu libro actual»; desmontar limpia el intervalo. `BookCard`: sin `page_count` no dice «N páginas»; enlace al lector presente con páginas publicadas y ausente con cero; sin enlace anidado dentro de otro enlace.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** ejecutar → PASA; `pnpm typecheck && pnpm lint`.
- [ ] **Paso 5: commit** `RF-13, RF-14: biblioteca del grupo con portada, estado en vivo y reintento`.

### Tarea 7: Lector `/libros/[id]`

**Archivos:**

- Crear: `app/libros/[id]/page.tsx`, `app/libros/[id]/book-reader.tsx` (cliente)
- Prueba: `app/libros/[id]/book-reader.test.tsx`

**Interfaces:**

- Consume: `PageReader` (props `total`, `loadPage`, `imageUrl`), `parsePage`, rutas de la tarea 4, `BookStatus` (tarea 6).
- Produce: `/libros/[id]` (servidor, con `Suspense` como `app/grupos/[id]/page.tsx`): valida UUID (`notFound()` si no); lee el libro por RLS (`notFound()` si no se ve, RN-03); cuenta las filas de `pages`; si hay 0 páginas muestra el título y `BookStatus` con «Aún no hay páginas listas»; si no, `BookReader`. `BookReader({ bookId, total })` pasa a `PageReader`: `loadPage = async (n) => parsePage(await (await fetch(\`/api/libros/${bookId}/paginas/${n}/datos\`)).json())`(lanza un error claro si no`ok`), `imageUrl = (n) => \`/api/libros/${bookId}/paginas/${n}/imagen\``. Mientras el libro se procesa, encima del lector aparece `BookStatus`(el`router.refresh()`de la tarea 6 actualiza`total`). Enlace «← Biblioteca» al grupo; título como `<h1>`.
- Un libro de varios grupos: el enlace de regreso usa el primer grupo del que la persona es miembro (consulta a `group_books`); si no hay, `/grupos`.

- [ ] **Paso 1: pruebas que fallan** (`fetch` simulado): `loadPage(3)` pide exactamente `/api/libros/<id>/paginas/3/datos`; respuesta 404 → error «Esta página aún se está procesando»; JSON inválido → el error de `parsePage`, no una pantalla en blanco; `imageUrl(2)` = `/api/libros/<id>/paginas/2/imagen`; con `total = 0` la página servidor no monta el lector (probar la función auxiliar pura que decide `"empty" | "reader"`, exportada del módulo).
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** ejecutar → PASA; `pnpm typecheck && pnpm lint`.
- [ ] **Paso 5: commit** `RF-14: lector de libros reales en /libros/[id] (RN-03)`.

### Tarea 8: Verificación real y documentos

**Archivos:**

- Modificar: `docs/requisitos/funcionales/RF-11-…md`, `RF-13-…md`, `RF-14-…md`, `docs/requisitos/no-funcionales/RNF-11-…md`, `docs/requisitos/INDEX.md`, `docs/ESTADO.md`; `e2e/` solo si una prueba no necesita sesión.

- [ ] **Paso 1: suite completa.** `pnpm typecheck && pnpm lint && pnpm test` → todo en verde (anotar el conteo).
- [ ] **Paso 2: build y navegador, sin pisar `pnpm dev` de la usuaria** (copia o puerto aparte, memoria `feedback-no-build-con-dev-abierto`): comprobar a 360, 768 y 1280 px y WebKit iPhone (Playwright) las pantallas que no exigen sesión real; capturar el ancho del formulario de subida, que no haya desbordamiento horizontal y que los botones midan ≥ 44 px. Lo que exija sesión real, ver paso 3.
- [ ] **Paso 3: humo de extremo a extremo, a cargo de la usuaria** (Claude no lee sus claves): con `samples/Der Schatz-3-7.pdf`, subir el PDF en un grupo → ver «En cola» → «Procesando X/Y» → «Listo» → abrirlo en `/libros/[id]`; subir el mismo PDF a otro grupo → disponible al instante; cortar la conexión a mitad de subida y reanudar; subir un archivo que no es PDF; forzar un error y probar «Reintentar» como no dueña (sin botón). Registrar cada resultado como verificado/no verificado.
- [ ] **Paso 4: documentar.** Actualizar los estados en cada archivo de requisito y en `INDEX.md` solo con lo realmente verificado (RF-11 criterios 1–5, RF-13 1–3, RF-14 1 y 2 —el 2, «última página leída», depende de RF-20 y queda sin verificar—, RNF-11 1). Quitar de `ESTADO.md` los pendientes de la 2c ya resueltos, dejar los que no (limpieza de solicitudes pendientes > 1 día, `%PDF-` dentro de los primeros 1024 bytes) y escribir el siguiente paso (revisión final de la rama, PR, RF-20).
- [ ] **Paso 5: commit** `RF-11, RF-13, RF-14: documenta verificación de la entrega 2d`.

## Autorrevisión

- Cobertura del spec: «subida reanudable con progreso» → tarea 5; «vínculo en segundos» → tarea 1 (idempotencia) y flujo de la tarea 5; «estado visible» → tareas 3 y 6; «biblioteca con portada, páginas y progreso» → tarea 6; `/libros/[id]` → tareas 4 y 7; límites de archivo en el navegador → tarea 3; pendientes de la 2c → tareas 1 y 2.
- Fuera de alcance a propósito: progreso real y última página (RF-20), quitar libros (RF-15), Realtime, limpieza periódica de solicitudes abandonadas.
- Consistencia de firmas: `describeStatus`/`canRetry`/`summarizeError`/`apiErrorMessage` (tarea 3) se usan en 5 y 6; `startResumableUpload` (5) solo en `UploadBook`; rutas de la tarea 4 solo en la tarea 7 y en `BookCard`; códigos de `request_retry` (1) = los de la ruta (2) = `apiErrorMessage` (3).
