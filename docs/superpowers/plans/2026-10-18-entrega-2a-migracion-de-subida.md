# Entrega 2a — Migración de subida segura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que `submit_book` deje de confiar en la huella del cliente (RN-02) y que `join_group` limite los intentos fallidos (RNF-17).

**Architecture:** Dos migraciones SQL. Las solicitudes de libro quedan «pendientes» en `book_submissions`; solo una función exclusiva de `service_role` (`finalize_submission`) crea el libro y lo vincula al grupo, con la huella calculada por el servidor. Los intentos fallidos de `join_group` se guardan en `join_attempts`.

**Tech Stack:** Postgres/Supabase (pgTAP), TypeScript + Vitest para el mensaje de error.

**Spec:** `docs/superpowers/specs/2026-10-18-subida-de-libros-design.md`

## Global Constraints

- Toda tabla nueva: `enable row level security`, `revoke all ... from anon, authenticated` y solo los `grant` mínimos (las tablas nuevas de `public` nacen con privilegios por defecto).
- Funciones nuevas: `security definer set search_path = ''`; `revoke execute ... from public, anon` y `grant` explícito (`authenticated` o `service_role`).
- RN-10: un solo libro en procesamiento por usuario; RN-02: libro único por huella SHA-256.
- Código SQL e identificadores en inglés; mensajes y documentación en español. Commits: `RNF-17: ...` / `RF-11: ...`, sin atribución de Claude.
- No hay Supabase CLI: las migraciones se aplican con `apply_migration` y las pruebas pgTAP (que terminan en `rollback`) se ejecutan con `execute_sql` del MCP de Supabase. **Antes de la primera aplicación, pedir confirmación a Allison** (cambio en la base real).

## Review Focus

- Un intento fallido debe **persistir**: lanzar una excepción deshace la transacción, por eso un código inexistente devuelve `null` en vez de lanzar (prueba en Task 1).
- Un usuario bloqueado por intentos es rechazado aunque use un código válido (Task 1).
- Acumular solicitudes pendientes no debe saltarse RN-10 (Task 2).
- `anon` y `authenticated` no pueden ejecutar `finalize_submission`/`reject_submission` ni insertar en `book_submissions` o `join_attempts` (Task 2).
- Ruta de subida ajena, archivo inexistente en Storage y título vacío se rechazan en `submit_book` (Task 2).
- Finalizar dos veces la misma solicitud falla con `not_pending` y no duplica filas (Task 2).

---

### Task 1: RNF-17 — límite de intentos de `join_group`

**Files:**

- Create: `supabase/migrations/20261018100000_limite_de_intentos_de_invitacion.sql`
- Create: `supabase/tests/join_attempts.test.sql`
- Modify: `lib/domain/group.ts:19-26`, `lib/domain/group.test.ts`, `components/group-forms.tsx:72-80`, `app/unirse/[code]/page.tsx:25-31`
- Modify: `supabase/tests/rls.test.sql:39` (el código inexistente ahora devuelve `null`)

**Interfaces:**

- Produces: `public.join_group(p_code text) returns uuid` (misma firma). Código inexistente → devuelve `null` y registra un intento; 10 intentos fallidos en la última hora → `raise exception 'too_many_attempts' using errcode = 'P0001'`, comprobado **antes** de buscar el código. Tabla `public.join_attempts (id bigint identity, user_id uuid references auth.users on delete cascade, attempted_at timestamptz default now())` con índice `(user_id, attempted_at)`, sin ningún privilegio para `anon`/`authenticated`.
- Produces: `groupErrorMessage({message: "too_many_attempts"})` → `"Demasiados intentos, inténtalo más tarde"`.

- [ ] **Step 1: Escribir `join_attempts.test.sql`** (misma estructura que `rls.test.sql`: `begin`, pgTAP, usuarios de prueba, `act_as`, `rollback`). Pruebas con sus mensajes: (a) `join_group('ZZZZZZZZ')` devuelve `null` sin lanzar; (b) tras ese intento `join_attempts` tiene 1 fila del usuario (leer como `reset_role`); (c) tras 10 fallos, el 11.º llamado con un código **válido** lanza `P0001`/`too_many_attempts`; (d) un unirse exitoso no inserta filas; (e) con intentos de hace 2 h (insertados con `attempted_at = now() - interval '2 hours'`) el usuario no está bloqueado; (f) como `authenticated`, `select * from public.join_attempts` falla con `42501`.
- [ ] **Step 2: Ejecutar la prueba y ver que falla** (`execute_sql` con el archivo). Esperado: fallo por tabla inexistente.
- [ ] **Step 3: Escribir la migración**: crear `join_attempts` (RLS activado, `revoke all`), reemplazar `join_group` con `create or replace` manteniendo `group_full` y el retorno temprano si ya es miembro; borrar de paso los intentos de más de 1 día del propio usuario.
- [ ] **Step 4: Confirmar con Allison, aplicar con `apply_migration` y ejecutar `join_attempts.test.sql`.** Esperado: todas las pruebas pasan.
- [ ] **Step 5: Ajustar `rls.test.sql:39`** a `is(public.join_group('ZZZZZZZZ'), null, 'código inexistente devuelve null')` y el `plan(N)` si cambia; ejecutarlo completo. Esperado: pasa.
- [ ] **Step 6: Prueba Vitest que falla** en `group.test.ts`: `groupErrorMessage({ message: "too_many_attempts" })` es `"Demasiados intentos, inténtalo más tarde"`. Ejecutar `pnpm test lib/domain/group.test.ts`; esperado: FALLA.
- [ ] **Step 7: Implementar** el caso en `groupErrorMessage` y, en `group-forms.tsx` y `unirse/[code]/page.tsx`, tratar `data === null` sin `error` como `"Código no válido"` (hoy caería en el mensaje genérico). `pnpm test lib/domain/group.test.ts && pnpm typecheck`; esperado: pasan.
- [ ] **Step 8: Commit** `RNF-17: límite de intentos fallidos al unirse a un grupo`.

---

### Task 2: RF-11 — solicitudes pendientes y huella verificada por el servidor

**Files:**

- Create: `supabase/migrations/20261018100100_solicitudes_de_libro.sql`
- Create: `supabase/tests/book_submissions.test.sql`
- Modify: `supabase/tests/rls.test.sql:41-60` (la parte de `submit_book`; ver Step 5)

**Interfaces:**

- Produces: tabla `public.book_submissions (id uuid pk default gen_random_uuid(), group_id uuid references groups on delete cascade, user_id uuid references auth.users on delete cascade, title text check (char_length between 1 and 200), upload_path text not null, status text default 'pending' check in ('pending','verified','rejected'), book_id uuid references books on delete set null, error text, created_at timestamptz default now())`; RLS: `select` solo `user_id = auth.uid()`; únicos privilegios: `select` para `authenticated`.
- Produces: `public.submit_book(p_group uuid, p_title text, p_upload_path text) returns uuid` (id de la solicitud; **se elimina** la firma antigua de 4 argumentos). Rechaza con: `not_authenticated` (28000), `forbidden` (42501: no es miembro o la ruta no empieza por `<uid>/`), `upload_missing` (P0002: no existe el objeto en el bucket `uploads`), `invalid_title` (P0001: vacío tras `btrim` o > 200), `busy` (P0001: el usuario tiene un `job` en `queued`/`processing` o una solicitud `pending` de menos de 15 minutos; los 15 minutos son decisión del asistente).
- Produces: `public.finalize_submission(p_submission uuid, p_sha256 text) returns jsonb`, solo `service_role`. Bloquea la fila (`for update`); si no está `pending` lanza `not_pending` (P0001). Si existe un libro con esa huella en `queued`/`processing`/`ready`: lo vincula al grupo (`on conflict do nothing`), marca la solicitud `verified` con `book_id` y devuelve `{book_id, reused: true, status, upload_path}`. Si no existe o está en `error`/`deleted`: re-comprueba RN-10 con `s.user_id`; si hay otro procesamiento marca `rejected` con `error = 'busy'` y devuelve `{rejected: 'busy'}`; si no, crea o reinicia el libro (`status = 'queued'`, `upload_path`, `uploaded_by`, `delete_after = null`), crea el `job`, vincula al grupo, marca `verified` y devuelve `{book_id, job_id, reused: false, status: 'queued'}`.
- Produces: `public.reject_submission(p_submission uuid, p_reason text) returns void`, solo `service_role`: marca `rejected` con el motivo si estaba `pending`.

- [ ] **Step 1: Escribir `book_submissions.test.sql`** (mismo andamiaje; los usuarios llaman a las funciones con `act_as`; las de servidor se ejecutan con `set local role service_role`). Subir objetos falsos con `insert into storage.objects` como en `rls.test.sql`. Pruebas, una por línea de Review Focus y por rechazo de `submit_book`: ruta ajena → `forbidden`; no miembro → `forbidden`; archivo inexistente → `upload_missing`; título `'   '` → `invalid_title`; segunda solicitud inmediata → `busy`; `submit_book` válido devuelve un uuid y **no** crea filas en `books` ni `group_books`; `authenticated` ejecutando `finalize_submission` → `42501`; `authenticated` haciendo `insert into book_submissions` → `42501`; otro usuario no ve la solicitud (0 filas); `finalize_submission` con libro nuevo crea libro `queued`, un `job` y `group_books`; con la misma huella y otro grupo/usuario devuelve `reused = true` sin crear otro `job`; finalizar dos veces → `not_pending`; con un job `processing` ajeno al libro devuelve `{rejected: 'busy'}` y deja la solicitud `rejected`; `reject_submission` marca `rejected`.
- [ ] **Step 2: Ejecutar la prueba; esperado: FALLA** (tabla/funciones inexistentes).
- [ ] **Step 3: Escribir la migración** con las tablas, funciones y permisos de la sección Interfaces (`drop function public.submit_book(uuid, text, text, text)` primero; `revoke all on public.book_submissions from anon, authenticated` y luego `grant select ... to authenticated`; `revoke execute ... from public, anon, authenticated` en las dos funciones de servidor y `grant execute ... to service_role`; `grant execute on submit_book(uuid,text,text) to authenticated`).
- [ ] **Step 4: Confirmar con Allison (si no lo hizo en Task 1), aplicar con `apply_migration`, ejecutar `book_submissions.test.sql`.** Esperado: todas pasan.
- [ ] **Step 5: Adaptar `rls.test.sql:41-60`** al nuevo contrato: A llama a `submit_book(gid, 'Libro', 'aaaa…/x.pdf')` (con su objeto en `storage.objects`), luego como `service_role` se llama `finalize_submission(sub, repeat('a',64))` y `sub` conserva una columna `r` con el jsonb para que las líneas siguientes (`(r ->> 'book_id')::uuid`) sigan funcionando. B repite con la misma huella y comprueba `reused = true`. Actualizar `plan(N)`; ejecutar el archivo completo. Esperado: pasa.
- [ ] **Step 6: Commit** `RF-11: solicitudes pendientes y huella verificada por el servidor (RN-02)`.

---

### Task 3: tipos, documentación y estado

**Files:**

- Modify: `lib/supabase/database.types.ts` (regenerar con `generate_typescript_types` del MCP)
- Modify: `docs/04-modelo-de-datos.md`, `docs/requisitos/funcionales/RF-11-*.md`, `docs/requisitos/no-funcionales/RNF-17-*.md`, `docs/requisitos/INDEX.md`, `docs/ESTADO.md`

- [ ] **Step 1:** Regenerar los tipos y ejecutar `pnpm typecheck && pnpm lint && pnpm test`. Esperado: sin errores (nada en la app llamaba a la firma antigua de `submit_book`).
- [ ] **Step 2:** Documentar en `docs/04-modelo-de-datos.md` las tablas `book_submissions` y `join_attempts` y el flujo pendiente → verificado. En RNF-17 pasar a «En progreso» y anotar qué criterios se verificaron con pgTAP (1–3) y que la interfaz sigue sin probarse en navegador. En RF-11 anotar «Verificación 2a» (solo la parte de base de datos).
- [ ] **Step 3:** Actualizar `docs/ESTADO.md` (retomar aquí: 2a hecha; siguiente 2b, plan por escribir; la usuaria debe guardar `SUPABASE_SERVICE_ROLE_KEY` en Vercel y los secretos de Actions) y `INDEX.md`.
- [ ] **Step 4: Commit** `RF-11: tipos, modelo de datos y estado tras la migración de subida`.
- [ ] **Step 5:** Avisar a Allison que es un buen momento para `/clear` y retomar con «Lee docs/ESTADO.md y continúa».
