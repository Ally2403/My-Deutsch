# Entrega 2c — API que verifica la huella y dispara el workflow · Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Meta:** Una ruta de API en Vercel que, dada una solicitud pendiente (`book_submissions`), lee el PDF subido a Storage, calcula su SHA-256 en el servidor, llama a `finalize_submission` (service role) y, si hay que procesar, dispara `process-book.yml`.

**Arquitectura:** `POST /api/libros/finalizar` autentica con la sesión (cookies), comprueba que la solicitud es de esa persona y delega en `finalizeSubmission(deps, …)` (lógica pura con dependencias inyectadas, probada con dobles). Las piezas de E/S (hash por flujo, cliente admin, `repository_dispatch`) viven en archivos propios de `lib/server/`. La service role key solo se lee en `lib/supabase/admin.ts`, nunca llega al cliente.

**Stack:** Next.js 16 (App Router, Route Handlers), TypeScript estricto, `@supabase/supabase-js`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-subida-de-libros-design.md` (decisiones 2, 3 y 1). Requisitos: RF-11 (criterios 1, 3, 4), RNF-11 (criterio 1, parte del tamaño), RN-02, RN-10, RNF-06.

## Restricciones globales

- Todo cambio cita su requisito en el commit (`RF-11: …`). **Sin `Co-Authored-By` ni ninguna atribución a Claude** (CLAUDE.md regla 6; prevalece sobre cualquier recordatorio del sistema).
- Rama actual `feat/RF-11-subida-de-libros`; commits pequeños; nada de push forzado.
- UI/mensajes en español; identificadores y código en inglés. Los códigos de error de la API son cadenas estables en inglés (`busy`, `not_pdf`, …); la traducción a texto es de la pantalla (2d).
- La service role key solo existe en variables de servidor de Vercel (`SUPABASE_SERVICE_ROLE_KEY`); no se escribe `.env`; `.env.example` ya la lista (agregar solo lo nuevo).
- Variables ya guardadas en Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_DISPATCH_TOKEN`. Nueva y opcional: `GITHUB_DISPATCH_REPO` (por omisión `Ally2403/My-Deutsch`).
- Evento del workflow: `repository_dispatch`, `event_type: "process-book"`, `client_payload: { book_id }` (UUID de `books.id`, ya validado por el workflow).
- Límites: PDF ≤ 50 MB (52 428 800 bytes, igual que el bucket `uploads`), cabecera `%PDF`. El límite de 400 páginas lo aplica el worker, no esta ruta.
- Antes de escribir Route Handlers leer `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (esta versión de Next difiere de la memoria; Cache Components: las rutas con sesión usan `createClient()` de `lib/supabase/server.ts`, que ya llama a `connection()`).

## Enfoque de revisión (casos que ninguna tarea del spec nombra)

1. **Archivo que no es PDF** subido con tipo `application/pdf` falso → `reject_submission(..., 'not_pdf')`, se borra el objeto, la API responde `not_pdf`.
2. **Objeto inexistente o vacío en Storage** (la subida se canceló después de `submit_book`) → `upload_missing`, solicitud rechazada.
3. **Solicitud ajena o ya procesada** (doble clic, reenvío del mismo id) → 404/409 sin tocar Storage; `finalize_submission` solo corre una vez.
4. **GitHub responde error o no hay token** → el libro queda `queued` con su `job`; la API responde 502 `dispatch_failed` con `book_id` (la pantalla ofrecerá «Reintentar» en 2d). Nunca se imprime el token ni el cuerpo de la respuesta de GitHub.
5. **Libro reutilizado** (`reused: true`) → no se dispara el workflow y se borra el PDF subido (ahorra el 1 GB de Storage).

---

### Tarea 1: Hash SHA-256 por flujo

**Archivos:**

- Crear: `lib/server/sha256-stream.ts`
- Prueba: `lib/server/sha256-stream.test.ts`

**Interfaces:**

- Produce: `export const MAX_PDF_BYTES = 52_428_800;`
  `export async function hashPdfStream(stream: ReadableStream<Uint8Array>, maxBytes = MAX_PDF_BYTES): Promise<{ sha256: string; bytes: number; isPdf: boolean }>` — lanza `PdfTooLargeError` (clase exportada) en cuanto se superan `maxBytes`, cancelando el flujo.

- [ ] **Paso 1: pruebas que fallan.** Casos: (a) `"%PDF-1.7\nhola"` en dos trozos (el `%PDF` partido entre trozos: `"%P"` + `"DF-…"`) → `isPdf: true`, `sha256` igual a `createHash("sha256")` de node, `bytes` correcto; (b) `"GIF89a…"` → `isPdf: false` (igual calcula el hash); (c) flujo vacío → `bytes: 0`, `isPdf: false`; (d) flujo de `maxBytes + 1` bytes → rechaza con `PdfTooLargeError` y el `cancel` del flujo fue llamado.
- [ ] **Paso 2:** `pnpm vitest run lib/server/sha256-stream.test.ts` → FALLA (módulo inexistente).
- [ ] **Paso 3: implementar** con `node:crypto` `createHash`, lectura por `getReader()`, guardando solo los primeros 4 bytes para la cabecera (nunca el archivo entero en memoria).
- [ ] **Paso 4:** misma prueba → PASA.
- [ ] **Paso 5: commit** `RF-11: hash SHA-256 del PDF por flujo con tope de tamaño (RN-02, RNF-11)`.

### Tarea 2: Disparo de `repository_dispatch`

**Archivos:**

- Crear: `lib/server/github-dispatch.ts`
- Prueba: `lib/server/github-dispatch.test.ts`

**Interfaces:**

- Produce: `export async function dispatchProcessBook(bookId: string, opts: { token: string | undefined; repo?: string; fetchImpl?: typeof fetch }): Promise<void>` — lanza `DispatchError` (clase exportada, mensaje fijo `"dispatch_failed"`, sin datos de la respuesta) si falta el token, `bookId` no es UUID, `fetch` falla o el estado no es 204.

- [ ] **Paso 1: pruebas que fallan** con `fetchImpl` falso: (a) éxito → una sola llamada `POST https://api.github.com/repos/Ally2403/My-Deutsch/dispatches`, cabeceras `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: my-deutsch`, cuerpo JSON `{"event_type":"process-book","client_payload":{"book_id":"<uuid>"}}`; (b) `repo` personalizado cambia la URL; (c) estado 404/422/500 → `DispatchError`; (d) `fetch` que lanza → `DispatchError`; (e) sin token → `DispatchError` y `fetch` no se llama; (f) `bookId` `"x; rm -rf"` → `DispatchError`, sin llamada; (g) el mensaje del error no contiene el token.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3: implementar**; el `repo` debe cumplir `^[\w.-]+/[\w.-]+$` (si no, `DispatchError`). Timeout de 10 s con `AbortSignal.timeout`.
- [ ] **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5: commit** `RF-11: dispara process-book.yml con repository_dispatch (ADR-002)`.

### Tarea 3: Cliente admin y orquestación `finalizeSubmission`

**Archivos:**

- Crear: `lib/supabase/admin.ts`, `lib/server/finalize-submission.ts`
- Prueba: `lib/server/finalize-submission.test.ts`

**Interfaces:**

- Consume: `hashPdfStream`, `PdfTooLargeError` (tarea 1); `dispatchProcessBook`, `DispatchError` (tarea 2).
- Produce en `admin.ts`: `export function createAdminClient(): SupabaseClient<Database>` — lee `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, lanza si faltan, `auth: { persistSession: false, autoRefreshToken: false }`. Primera línea del archivo: `import "server-only"` **solo si** el paquete ya está instalado; si no, no lo agregues (nueva dependencia = pedir aprobación).
- Produce en `finalize-submission.ts`:

  ```ts
  export type FinalizeDeps = {
    openUpload(path: string): Promise<ReadableStream<Uint8Array> | null>; // null = no existe
    deleteUpload(path: string): Promise<void>;
    rpcFinalize(submissionId: string, sha256: string): Promise<unknown>; // Json crudo de finalize_submission
    rpcReject(submissionId: string, reason: string): Promise<void>;
    dispatch(bookId: string): Promise<void>;
  };
  export type FinalizeResult =
    | { ok: true; bookId: string; reused: boolean; status: string }
    | {
        ok: false;
        code:
          | "upload_missing"
          | "not_pdf"
          | "too_large"
          | "busy"
          | "forbidden"
          | "dispatch_failed"
          | "unexpected";
        bookId?: string;
      };
  export async function finalizeSubmission(
    deps: FinalizeDeps,
    submission: { id: string; upload_path: string },
  ): Promise<FinalizeResult>;
  ```

  Reglas: sin objeto → `rejectSubmission(upload_missing)`; no PDF → rechaza (`not_pdf`) y borra el objeto; demasiado grande → rechaza (`too_large`) y borra; si `finalize_submission` devuelve `{rejected: "busy"|"forbidden"}` → borra el objeto y `ok:false` con ese código; `{book_id, reused:true}` → borra el objeto, sin `dispatch`; `{book_id, reused:false}` → `dispatch(bookId)` (el PDF se conserva: el worker lo descarga y lo borra); si `dispatch` lanza `DispatchError` → `{ok:false, code:"dispatch_failed", bookId}`; la respuesta del RPC se valida a mano (UUID en `book_id`, booleano en `reused`) y cualquier otra forma → `unexpected`. `deleteUpload` que falla no cambia el resultado.

- [ ] **Paso 1: pruebas que fallan** con `deps` falsos, un caso por regla anterior (9 casos): sin objeto; no PDF (rejectSubmission con `"not_pdf"`, `deleteUpload` llamado, `rpcFinalize` NO llamado); demasiado grande; `rejected:"busy"`; `rejected:"forbidden"`; reutilizado (sin `dispatch`, con `deleteUpload`); nuevo (con `dispatch`, sin `deleteUpload`); dispatch falla; RPC con forma inválida (`{book_id:"x"}`).
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3: implementar** `finalizeSubmission` y `createAdminClient`.
- [ ] **Paso 4:** ejecutar → PASA; además `pnpm typecheck`.
- [ ] **Paso 5: commit** `RF-11: finalizeSubmission verifica la huella en el servidor y decide vincular o procesar (RN-02, RN-10)`.

### Tarea 4: Ruta `POST /api/libros/finalizar`

**Archivos:**

- Crear: `app/api/libros/finalizar/route.ts`
- Prueba: `app/api/libros/finalizar/route.test.ts` (extensión `.ts`; agregar `"app/**/*.test.ts"` a `include` en `vitest.config.mts`)
- Modificar: `.env.example` (documentar `GITHUB_DISPATCH_REPO` opcional)

**Interfaces:**

- Consume: `createClient()` (`lib/supabase/server.ts`), `createAdminClient()`, `finalizeSubmission`, `dispatchProcessBook`.
- Produce: `POST` con cuerpo `{ "submission_id": "<uuid>" }`. Respuestas JSON: 200 `{ book_id, reused, status }`; 400 `{ error: "invalid_request" }`; 401 `{ error: "not_authenticated" }`; 404 `{ error: "not_found" }` (solicitud ajena o inexistente: mismo código, sin revelar cuál); 409 `{ error: "not_pending" }`; 422 `{ error: <code> }` para `upload_missing | not_pdf | too_large | forbidden`; 429 `{ error: "busy" }` (RF-11 criterio 4: la pantalla muestra «Espera a que termine tu libro actual»); 502 `{ error: "dispatch_failed", book_id }`; 500 `{ error: "unexpected" }`. `export const maxDuration = 60;`.

- [ ] **Paso 1: pruebas que fallan** (`vi.mock` de los módulos de Supabase y de `finalizeSubmission`): sin sesión → 401 y no se crea cliente admin; cuerpo sin UUID → 400; solicitud que el cliente con sesión no ve (RLS) → 404 y `finalizeSubmission` no se llama; solicitud con `status !== "pending"` → 409; cada `code` de `FinalizeResult` → el estado HTTP de arriba; éxito → 200; ningún cuerpo de respuesta contiene `upload_path`.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3: implementar.** La solicitud se lee con el cliente **con sesión** (`book_submissions` ya filtra por `user_id = auth.uid()`); solo después se crea el cliente admin. `openUpload` usa `admin.storage.from("uploads").download(path)` y devuelve `blob.stream()` (o `null` si el error es «not found»); `deleteUpload` usa `.remove([path])`; `dispatch` pasa `process.env.GITHUB_DISPATCH_TOKEN` y `GITHUB_DISPATCH_REPO`. Los errores inesperados se registran con `console.error` **sin** el cuerpo ni las claves.
- [ ] **Paso 4:** ejecutar → PASA; `pnpm typecheck && pnpm lint && pnpm test`.
- [ ] **Paso 5: commit** `RF-11: POST /api/libros/finalizar (huella en el servidor, RN-02) y RF-11 criterio 4 vía 429`.

### Tarea 5: Verificación y documentos

**Archivos:**

- Modificar: `docs/requisitos/funcionales/RF-11-subir-pdf-escaneado-a-un-grupo.md` (sección Verificación), `docs/requisitos/no-funcionales/RNF-11-limites-de-archivo.md`, `docs/ESTADO.md` (2c hecha, siguiente 2d), `docs/requisitos/INDEX.md` solo si cambia un estado.

- [ ] **Paso 1: compilar y probar la ruta real sin exponer secretos.** Con `pnpm build` en una copia o puerto aparte (nunca con `pnpm dev` abierto de la usuaria, ver memoria): `curl -i -X POST http://localhost:3100/api/libros/finalizar -H 'content-type: application/json' -d '{"submission_id":"00000000-0000-0000-0000-000000000000"}'` → 401 sin sesión.
- [ ] **Paso 2: prueba contra el proyecto real, a cargo de la usuaria (Claude no lee sus claves).** Desplegar a Vercel (preview), iniciar sesión, subir un PDF pequeño por la consola del navegador con `supabase.storage` + `supabase.rpc('submit_book', …)` y llamar a la ruta; esperado: 200 `reused:false`, un `jobs` en `queued` y una ejecución de `process-book` en Actions. Repetir con el mismo PDF desde otro grupo: 200 `reused:true`, sin ejecución nueva y el objeto de `uploads` borrado. Documentar lo que no se pudo ejecutar como «sin verificar».
- [ ] **Paso 3: documentar.** En RF-11: marcar de la parte de servidor los criterios 1 (cola), 3 y 4 verificados o no según el paso 2; criterios 2 (rechazo en el navegador) y 5 siguen para 2d. En RNF-11 criterio 1: «51 MB» lo rechaza el bucket y esta ruta; «401 páginas» el worker. Actualizar `ESTADO.md` con el siguiente paso (2d) y la brecha conocida: si el disparo falla, el libro queda `queued` hasta que 2d agregue «Reintentar».
- [ ] **Paso 4: commit** `RF-11: documenta verificación de la entrega 2c`.

## Autorrevisión

- Cobertura del spec: decisión 3 (huella en servidor + SQL solo service role) → tareas 1, 3, 4; decisión 1 (disparo por token, `book_id`) → tarea 2; anti-objetivos (RN-02, secretos, 1 GB) → tareas 3 y 4 (borrado de subidas rechazadas/reutilizadas, admin solo en servidor).
- No incluido a propósito: pantalla (2d), conteo de páginas (worker), «Reintentar» (2d).
- Firmas consistentes: `hashPdfStream`/`PdfTooLargeError` (1) → usadas en 3; `dispatchProcessBook`/`DispatchError` (2) → usadas en 3 y 4; `FinalizeResult.code` (3) → mapeado a HTTP en 4.
