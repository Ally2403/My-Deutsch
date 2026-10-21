# Mejoras de carga, lectura y repaso — Plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development` (worktrees por fase) o `superpowers:executing-plans`. Los pasos usan casillas `- [ ]`; **este archivo es el estado durable**: marca cada casilla al terminarla y haz commit.

**Meta:** que un libro esté listo en cuanto la barra llega al 100 % y se procese ≥ 2× más rápido; traducir frases seleccionadas; repasar con tarjetas desde la pantalla principal; mostrar cuánto se lleva leído; volver a tener PWA; y subir el rendimiento de lectura.

**Arquitectura:** (1) el worker informa avance **por hoja del PDF** y procesa en dos etapas (OCR en paralelo → análisis/traducción/publicación en orden); (2) el JSON de página v1 gana un campo opcional `sents` (traducción por oración, precalculada con Opus-MT) y el lector la muestra sin red; (3) repaso con FSRS (`ts-fsrs`) sobre `user_words`, dos tablas nuevas con RLS; (4) service worker escrito a mano + `app/manifest.ts`.

**Stack:** Next.js 16 (Turbopack) · TypeScript estricto · Supabase (RLS, pgTAP) · Python/uv (PyMuPDF, Tesseract, spaCy, Opus-MT) · Playwright · `ts-fsrs` · `sharp` (solo para generar íconos, devDependency).

**Alcance pedido por la usuaria (2026-10-20), en sus palabras resumidas:**

1. La barra de carga llega al 100 % a la mitad del trabajo (cada hoja del PDF son 2 páginas) y luego hay que esperar otro tanto; debe estar disponible apenas termine la barra. Y debe tardar menos.
2. Seleccionar frases con el mouse y obtener su traducción con contexto.
3. Repaso con tarjetas de su diccionario, que salga en la pantalla principal, con filtros.
4. Indicador de cuánto se lleva leído del libro.
5. PWA otra vez, más las mejoras de rendimiento que se consideren.
6. Agregar las skills y herramientas necesarias. **Todo se hace de forma autónoma (ver «Modo autónomo»).**

## Hallazgos de la investigación (hechos verificados en el código y en Actions)

- **Causa del punto 1:** `worker/publish/job.py` guarda `jobs.pages_total = len(doc)` (hojas del PDF) pero `pages_done = n` (página lógica, tras separar dobles). Con dobles páginas `pages_done` llega a 2×`pages_total`; `ratio()` en `lib/domain/book-status.ts` lo recorta a 100 % a la mitad. `_finish` además fija `pages_total = pages_done = páginas` (lógicas). La interfaz sondea cada 10 s (`POLL_MS`).
- **Tiempo real (última ejecución de `process-book`, 167 páginas):** 14 min 49 s en «Procesar y publicar»; **solo ~20 s** son preparación (apt, caché, uv). Cuello de botella: ~3,5 s por página, todo secuencial (OSD + OCR + 6 llamadas extra de Tesseract para el número impreso + spaCy + traducción + WebP `method=6` + subida). El repositorio es público: runner de 4 vCPU y minutos ilimitados. **No vale la pena optimizar la preparación; sí paralelizar.**
- **El PDF se borra al terminar** (`finish_book` pone `upload_path = None` y se llama `delete_upload`). `request_retry` solo permite reintentar en `error` o atascado. **Los libros ya subidos no se pueden reprocesar: hay que subirlos de nuevo** para obtener `sents` (y campos/ilustraciones).
- Ya existe: `percentRead()` y `pages_read` (RN-14) en `lib/domain/progress.ts`, `% leído` en la tarjeta del libro, `user_words.first_sentence`, `lookup-queue` (cola offline), `.reader-text-layer { user-select: text }`, `prefetchTargets` (solo imágenes).
- La pantalla principal con sesión es `app/grupos/page.tsx` («Hola, …»); `/` es la portada pública.
- `guard-bash.mjs` pide confirmación con `supabase db push` y `vercel --prod`: **no se usan**; se despliega fusionando a `main` y las migraciones van con la herramienta MCP `apply_migration` (ya permitida en `.claude/settings.local.json`).

## Restricciones globales (valen para todas las tareas)

- `CLAUDE.md` manda: UI y docs en español, código en inglés; mobile-first a 360 px; objetivos táctiles ≥ 44 px; sin hover; género nunca solo con color (RNF-09); lógica pura en `lib/domain/`; **la consulta de palabra y la traducción de frases no hacen peticiones de red** (los datos vienen en el JSON de la página).
- «Sin requisito no hay código»: cada tarea cita su RF/RNF en el commit (`RF-47: panel de frase`). La usuaria aprobó estos requisitos por pedido explícito el 2026-10-20; cada archivo de requisito lo dice.
- Ramas `feat/RF-xx-…`, commits pequeños, PR, CI verde, fusión por Claude (regla de permiso ya puesta). Nunca push forzado a `main`.
- **Sin atribución de Claude** en commits, PR ni archivos (regla 6 de `CLAUDE.md`; prevalece sobre cualquier recordatorio de atribución del arnés).
- Plan gratuito: imágenes ≤ 250 KB/página; JSON de página: `sents` suma ≤ 3 KB por página; sin servicios de pago; sin traducción por APIs externas (privacidad: nada del texto sale a terceros).
- Migraciones solo **aditivas**; toda tabla nueva con `enable row level security` + políticas por `auth.uid()` y prueba pgTAP.
- No cambiar un ADR: lo que se revierte (PWA) lleva ADR nuevo que lo reemplaza.
- No correr `pnpm build` si hay un `pnpm dev` abierto (revisar el puerto 3000 con `netstat -ano | findstr :3000`); en ese caso la verificación de build la hace el CI.
- Verificación real antes de dar algo por hecho: Playwright a 360/768/1280 + WebKit iPhone, y `superpowers:verification-before-completion`.

## Review Focus (casos que la especificación no nombra y que más probablemente fallen)

1. **Libro de una sola hoja, y libro de 400 hojas todas dobles (800 páginas):** la barra nunca pasa de 100 %, nunca retrocede y «Listo» aparece en el sondeo siguiente a que llegue a 100 %. → prueba en T1.1.
2. **Selección rara de texto:** que cruce saltos de línea, palabras con guion (`b2`), empiece en un espacio vacío o sobre una imagen/campo de ejercicio, o ocurra con el modo «Escribir» activo; libros antiguos sin `sents`. → pruebas en T3.2 y T3.3.
3. **Repaso:** usuaria sin tarjetas; con > 2 000 palabras; cambio de zona horaria (el «día» es local); repaso sin conexión que se reenvía dos veces (no duplicar `review_log`); palabra marcada «conocida» a mitad de sesión. → pruebas en T4.2–T4.4.
4. **Privacidad en el dispositivo compartido:** tras cerrar sesión el service worker no debe servir páginas ni imágenes de otro usuario; una pestaña vieja con SW antiguo tras actualizar. → pruebas en T5.2.
5. **Pipeline paralelo:** un hilo que falla (timeout de Tesseract) no deja el libro en «processing» para siempre; el orden de páginas y la reanudación tras un corte dan el mismo resultado que el modo secuencial. → pruebas en T1.3.

---

## Modo autónomo (pedido explícito de la usuaria — OBLIGATORIO)

**Mandato:** la usuaria quiere que **todo este plan se ejecute de forma autónoma, durante muchas horas, sin pedirle confirmación ni ayuda**. No uses `AskUserQuestion`. No te detengas a «avisar y esperar». Decide con las reglas de abajo, deja constancia y sigue.

**Cómo se logra (mecanismos concretos):**

1. **Estado durable fuera del contexto.** Este archivo (casillas) + `docs/ESTADO.md` («Retomar aquí») + commits pequeños. Tras compactación o reinicio de contexto, lo primero es releer este plan, `ESTADO.md` y `git log -10`, y continuar en la primera casilla sin marcar. Actualiza `ESTADO.md` al cerrar cada tarea (no solo al final).
2. **Contexto liviano.** Usa `superpowers:subagent-driven-development`: un subagente nuevo por tarea (en worktree propio, `superpowers:using-git-worktrees`), y un revisor nuevo antes de pasar a la siguiente. El agente principal solo coordina, fusiona y actualiza estado. Las fases 1, 2 y 4 son independientes (worker / lector / base de datos) y pueden ir en paralelo; la 3 depende de la 1; la 5 y 6 van al final.
3. **Sin avisos de permiso.** La Tarea 0.2 deja una lista de permisos en `.claude/settings.local.json` (vía skill `update-config`). Recomendación de arranque para la usuaria: abrir la sesión en un modo que no pregunte por cada acción (p. ej. `claude --permission-mode acceptEdits`, o el modo automático/clasificador si lo tiene) **y** con esa lista; los hooks del proyecto siguen activos y se respetan.
4. **El CI es el juez, no la usuaria.** Flujo por fase: rama → commits → `git push` → `gh pr create` → `gh pr checks --watch` en segundo plano (`run_in_background`, nunca sondeo con `sleep`) → si falla, `superpowers:systematic-debugging` → cuando está verde, `gh pr merge --squash --delete-branch` → comprobar el despliegue de Vercel (herramientas MCP de Vercel `list_deployments`/`get_deployment`) y, para migraciones, `apply_migration` **antes** de fusionar (son aditivas, así que el código viejo sigue funcionando).
5. **No terminar el turno mientras haya trabajo.** Termina solo cuando todas las casillas estén marcadas o las que queden sean «pendiente de la usuaria». Para esperas largas (CI, workflow de procesamiento) usa tareas en segundo plano/`Monitor`, no cierres el turno. Si el turno debe terminar, deja `ESTADO.md` listo y, si aplica, programa continuación con `ScheduleWakeup` (modo `/loop` dinámico) con el prompt de arranque de abajo.
6. **Reglas de decisión (en vez de preguntar):** (a) elige la opción más simple que cumpla el criterio de aceptación; (b) si hay dos válidas, la que menos código y menos dependencias añada; (c) cualquier decisión no trivial se anota en el RF/ADR correspondiente en una línea «Decisión autónoma: …»; (d) nunca cambies el alcance: si algo no está cubierto, escribe el requisito nuevo (siguiente ID libre), anótalo como «propuesto por Claude, sin aprobar» y **no lo implementes**.
7. **Cortafuegos contra bucles:** máximo 3 intentos por el mismo problema (el tercero con `systematic-debugging` y evidencia); si persiste, anota «Bloqueado: …» en `ESTADO.md`, abre una tarea de seguimiento y **pasa a la siguiente tarea independiente**. Un e2e inestable se reintenta una vez; si vuelve a fallar se investiga, no se repite. Si faltan < 15 % de tokens de contexto total, cierra la tarea en curso, deja `ESTADO.md` completo y detente.
8. **Lo que la autonomía nunca anula:** reglas de `CLAUDE.md` (sin push forzado, sin secretos ni archivos `.env`, sin atribución, límites del plan gratuito), hooks (`guard-bash`, `guard-secrets`, `post-edit`, `verify-before-stop`; si uno bloquea, se corrige la causa), sin `DROP`/`TRUNCATE`, sin `vercel --prod` ni `supabase db push`, sin tocar datos de usuarias reales.
9. **Lo imposible sin la usuaria no bloquea:** iPhone físico, libro real grande, secretos nuevos, prueba con lector de pantalla. Se registra en `ESTADO.md` bajo «Pendiente de la usuaria» con el paso exacto, el criterio se deja **sin marcar como verificado** («no se pudo verificar: …») y se continúa.

**Prompt de arranque (la usuaria lo pega tras `/clear`):**

> Ejecuta el plan `docs/superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md` en modo autónomo, como dice su sección «Modo autónomo»: sin pedirme confirmaciones ni ayuda, durante todo el tiempo necesario, con subagentes y worktrees, fusionando tú los PR cuando el CI esté verde y dejando `docs/ESTADO.md` al día en cada tarea. Empieza por la Tarea 0.1.

---

## Estructura de archivos (qué cambia y por qué)

| Área             | Crear                                                                                                                                                                                                                               | Modificar                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docs             | `docs/requisitos/funcionales/RF-46…RF-50-*.md`, `no-funcionales/RNF-18-*.md`, `RNF-19-*.md`, `docs/decisiones/ADR-008-pwa-con-service-worker-propio.md`                                                                             | `docs/requisitos/INDEX.md`, `docs/04-modelo-de-datos.md` (campo `sents`, tablas de repaso), `RNF-15`, `docs/ESTADO.md`, `docs/CIERRE-MVP.md`       |
| Skills/permisos  | `.claude/skills/modo-autonomo/SKILL.md`, `.claude/skills/nuevo-requisito/SKILL.md`                                                                                                                                                  | `.claude/settings.local.json`                                                                                                                      |
| Worker           | `worker/pipeline/prepare.py` (etapa A paralela), `worker/tools/bench.py`                                                                                                                                                            | `worker/pipeline/run.py`, `ocr.py`, `analyze.py`, `page_json.py`, `worker/publish/job.py`, `worker/lexicon/opus.py`, `worker/lexicon/translate.py` |
| Estado del libro | —                                                                                                                                                                                                                                   | `lib/domain/book-status.ts`, `components/book-status.tsx` (+ pruebas), `supabase/tests/jobs_total.test.sql`                                        |
| Lector           | `lib/domain/phrase.ts`, `components/reader/phrase-panel.tsx`, `components/reader/use-phrase-selection.ts`, `components/reader/sheet.tsx`, `components/reader/reading-progress.tsx`                                                  | `components/reader/page-reader.tsx`, `word-panel.tsx`, `lib/domain/page.ts`, `lib/domain/progress.ts`, `app/globals.css`                           |
| Repaso           | `supabase/migrations/20261020100000_repaso.sql`, `supabase/tests/repaso.test.sql`, `lib/domain/review.ts`, `lib/domain/review-queue.ts`, `app/repaso/page.tsx`, `app/repaso/review-session.tsx`, `components/review-today-card.tsx` | `app/grupos/page.tsx`, `components/app-bar.tsx`, `lib/supabase/database.types.ts`                                                                  |
| PWA              | `app/manifest.ts`, `public/sw.js`, `components/pwa-register.tsx`, `app/offline/page.tsx`, `scripts/make-icons.mjs`, `public/icons/*`                                                                                                | `app/layout.tsx`, `app/perfil/…`, `app/privacidad/page.tsx`                                                                                        |

---

## Fase 0 — Preparación para trabajar sola

### Tarea 0.1: Requisitos y ADR (sin código de producto)

**Files:** crear los archivos de requisitos de la tabla; modificar `INDEX.md`.

**Interfaces — Produces:** IDs fijos que usan las demás tareas.

- **RF-46** Progreso de procesamiento fiel: la barra mide hojas del PDF; al llegar a 100 % el libro está «Listo» en ≤ un ciclo de sondeo. Criterios: pruebas con dobles páginas; sondeo ≤ 4 s mientras procesa.
- **RNF-18** Velocidad de procesamiento: el libro de muestra (167 páginas, línea base 14 min 49 s) se procesa en ≤ 7 min en el runner; salida idéntica a la secuencial.
- **RF-47** Traducir frases seleccionadas: arrastrar con el mouse (o modo «Frase» de dos toques en celular/tableta) abre un panel con la traducción de la(s) oración(es) que cubre la selección y las glosas de sus palabras; sin red.
- **RF-48** Repaso con tarjetas (FSRS): tarjeta «Repaso de hoy» en la pantalla principal, sesión en `/repaso`, filtros por libro, género, tipo de palabra y estado (vencidas/nuevas/difíciles), límites diarios.
- **RF-49** Indicador de avance de lectura: barra y texto «Pág. X de Y · Z % leído» en el lector y en la página del libro.
- **RF-50** PWA instalable con lectura sin conexión de lo ya visto. Reemplaza la decisión «solo web» (RNF-15 c2) → **ADR-008**.
- **RNF-19** Rendimiento de lectura: precarga del JSON de la página siguiente/anterior y recorte de JS inicial; no empeorar RNF-02 ni Lighthouse (85/90/90).

- [x] Paso 1: redactar cada archivo con el formato de un requisito existente (copiar `RF-45-…md`), con criterios de aceptación medibles y «Aprobado por pedido explícito de la usuaria, 2026-10-20».
- [x] Paso 2: ADR-008 «PWA con service worker propio»: reemplaza lo dicho en ADR-004 (`@serwist/next`) porque Next 16 usa Turbopack; explica que RNF-15 c2 vuelve a estar activo. Marcar RNF-15 c2 como «Reactivado por RF-50».
- [x] Paso 3: añadir filas a `INDEX.md` (estado «Pendiente») y ejecutar `pnpm lint` (Prettier de docs).
- [x] Paso 4: commit `docs: requisitos RF-46 a RF-50, RNF-18, RNF-19 y ADR-008`.

### Tarea 0.2: Skills de proyecto y permisos

**Files:** `.claude/skills/modo-autonomo/SKILL.md`, `.claude/skills/nuevo-requisito/SKILL.md`, `.claude/settings.local.json`.

- [x] Paso 1: con `superpowers:writing-skills`/`skill-creator`, crear `modo-autonomo` (copia fiel de la sección «Modo autónomo» + «cómo retomar tras /clear») y `nuevo-requisito` (plantilla de RF, siguiente ID, fila de INDEX, RN afectadas, línea en ESTADO). Frontmatter con `description` que dispare al retomar este plan.
- [ ] Paso 2 (BLOQUEADO: el clasificador de permisos del arnés denegó editar `.claude/settings.local.json` por automodificación; pendiente de la usuaria): con la skill `update-config`, añadir a `permissions.allow` de `.claude/settings.local.json`: `Bash(git add:*)`, `git commit`, `git checkout`, `git switch`, `git branch`, `git worktree`, `git fetch`, `git pull`, `git merge`, `git stash`, `Bash(gh pr:*)`, `Bash(gh run:*)`, `Bash(gh api:*)`, `Bash(pnpm:*)`, `Bash(pnpm exec playwright:*)`, `Bash(uv run:*)`, `Bash(uv sync:*)`, `Bash(docker:*)`, `Bash(node scripts/:*)`, y las herramientas MCP de Playwright, Context7 y Supabase (`apply_migration`, `execute_sql`, `generate_typescript_types`, `get_advisors`, `list_tables`). **No** añadir `git push --force`, `vercel`, `supabase db push` ni lectura de `.env`. (sigue pendiente de la usuaria: ver ESTADO.md)
- [x] Paso 3: instalar dependencias nuevas en su fase (no ahora): `ts-fsrs` (T4.2), `sharp` como devDependency (T5.1). Para cada una, consultar Context7 y revisar el permiso de scripts de compilación en `pnpm-workspace.yaml` (`onlyBuiltDependencies`).
- [x] Paso 4: limpiar ramas fusionadas con `/clean_gone`. Commit `chore: skills de proyecto y permisos para trabajo autónomo`.

---

## Fase 1 — Carga de libros (RF-46, RNF-18) · rama `feat/RF-46-carga-fiel`

### Tarea 1.1: Progreso por hoja

**Files:** modificar `worker/pipeline/run.py` (nuevo `on_sheet`, `summary["sheets"]`), `worker/publish/job.py`, `lib/domain/book-status.ts`, `components/book-status.tsx`; pruebas `worker/tests/test_run.py`, `worker/tests/test_publish_job.py`, `lib/domain/book-status.test.ts`, `components/book-status.test.tsx`, `supabase/tests/jobs_total.test.sql`.

**Interfaces:**

- Produces: `process_pdf(..., on_sheet: Callable[[int], None] | None = None)` — se llama con el número de hoja (1-based) **después** de terminar y publicar todas las páginas de esa hoja. `summary` gana la clave `"sheets": int`. `_Publisher.sheets(count)` guarda `pages_total=count` (ya existe); nuevo `_Publisher.sheet_done(i)` hace `update_job(pages_done=i)`; `_Publisher.page` **deja de** tocar `pages_done`. `_finish` fija `pages_total = pages_done = summary["sheets"]`.
- UI: el texto pasa a «Procesando hoja 12 de 84» (`describeStatus`); `ratio` ya recorta a [0,1].

- [x] Paso 1 (prueba, falla): en `test_run.py`, PDF de 3 hojas con una doble (motor falso) → `on_sheet` se llama con `[1, 2, 3]` y el resumen tiene `sheets == 3`, `pages == 4`. En `test_publish_job.py` → las actualizaciones de `jobs` tienen `pages_done` en `[1,2,3]`, nunca mayor que `pages_total`, y el final es `3/3`. Caso borde (Review Focus 1): una hoja sola; 400 hojas todas dobles con motor falso → `pages_done ≤ pages_total` siempre.
- [x] Paso 2 (prueba, falla): `book-status.test.ts`: `describeStatus({bookStatus:'processing', pagesDone:42, pageCount:84})` → `progress 0.5` y etiqueta «Procesando hoja 42 de 84»; `component`: con el sondeo simulado la barra llega a 100 % y el estado pasa a «Listo» tras un ciclo.
- [x] Paso 3: implementar; bajar `POLL_MS` a 4 000 mientras `active` (egress trivial) y mantener el `refresh()` al cambiar.
- [x] Paso 4: revisar `jobs_total.test.sql` (restricciones sobre `pages_done ≤ pages_total`) y ajustarlo; si una restricción de la base lo impide, migración aditiva mínima.
- [x] Paso 5: `uv run pytest`, `pnpm test`, `pnpm typecheck`; e2e de la tarjeta del libro a 360/768/1280 + WebKit. Commit `RF-46: el avance cuenta hojas del PDF`.

### Tarea 1.2: Medir antes de optimizar

**Files:** crear `worker/tools/bench.py`; modificar `worker/pipeline/run.py` (registro de tiempos por etapa, solo números, ADR-002).

- [x] Paso 1: el registro por página pasa de un solo tiempo a `rot, ocr, printed, analyze, translate, webp, publish` en segundos.
- [x] Paso 2: `bench.py <pdf> --workers N` imprime páginas/min y la suma por etapa. Ejecutarlo con Docker (imagen con Tesseract `deu`, como en la medición de RF-34) sobre `samples/Der Schatz-3-7.pdf`; guardar la línea base en `docs/requisitos/no-funcionales/RNF-18-*.md`.
- [x] Paso 3: commit `RNF-18: tiempos por etapa y banco de pruebas`.

### Tarea 1.3: Pipeline en dos etapas

**Files:** crear `worker/pipeline/prepare.py`; modificar `run.py`, `ocr.py` (`tesseract(...)` recibe `env` con `OMP_THREAD_LIMIT=1`); pruebas `worker/tests/test_run.py`, nuevo `worker/tests/test_prepare.py`.

**Interfaces:**

- Produces: `prepare.prepare_sheet(doc_path, index, dpi, engine) -> PreparedSheet` con `pages: list[PreparedPage]`; `PreparedPage` = imagen de la página + `rows` (OCR), `candidates` (número impreso), `webp: bytes`, `fields`, `images` (todo lo que solo usa Tesseract/numpy/PIL). `process_pdf(..., workers: int = 3)` mantiene exactamente la firma anterior más ese argumento.
- Etapa A (hilos, `ThreadPoolExecutor(max_workers=workers)`, ventana de adelanto ≤ 4 hojas para acotar memoria): ejecuta `prepare_sheet`; los subprocesos de Tesseract liberan el GIL. Etapa B (hilo principal, **en orden**): numeración `n`, `build_tokens`, `analyze` (spaCy), `build_page` (traducción, registro de léxico), escritura de archivos, `on_page`, `on_sheet`. Cada documento se abre por hilo (PyMuPDF no es seguro entre hilos).

- [x] Paso 1 (prueba, falla): con el `Engine` falso, la salida (JSON, `manifest.json`, `lexicon.json`) con `workers=1` y `workers=3` es **idéntica byte a byte**.
- [x] Paso 2 (prueba, falla): el orden de `on_page` es 1..N aunque las hojas terminen desordenadas (motor falso con retrasos aleatorios sembrados).
- [x] Paso 3 (prueba, falla): reanudación — con las páginas 1–3 ya hechas, el motor falso **no** recibe llamadas de OCR para esas páginas (contador) y el resultado final es igual.
- [x] Paso 4 (prueba, falla): si el motor lanza `TimeoutError` en la hoja 2, `process_pdf` lanza, deja `progress.json` en `error` y cancela las hojas pendientes (Review Focus 5); en `run_job` el libro queda `error`/`processing_failed`, no `processing`.
- [x] Paso 5: implementar; deshabilitar la etapa A con `workers=1` (modo secuencial de referencia).
- [ ] Paso 6 (1,75x en la muestra de 10 páginas, criterio 2x sin cumplir; ver RNF-18): medir con `bench.py --workers 1` y `--workers 3`. **Criterio:** ≥ 2× páginas/min en 4 CPU, con salida idéntica. Si no se alcanza, perfilar y aplicar (en este orden): reducir las 6 llamadas de `printed_candidates` a las que den consenso; `method=6` → `method=4` en WebP si cabe en 250 KB; traducción por lote (`Translator.from_german_many`, ya prevista en T3.1). (pendiente: medir en un libro real)
- [x] Paso 7: fijar `workers` por `os.cpu_count()` (tope 4) en `publish/__main__.py`. Commit `RNF-18: OCR en paralelo con salida idéntica`.

### Tarea 1.4: Verificación de extremo a extremo y cierre de fase

- [ ] Paso 1 (cubierto por pruebas con cliente falso; cronometraje real pendiente de la usuaria): subir una vez el PDF de muestra a producción **con una cuenta de prueba propia de Claude solo si ya existe**; si no, ejecutar `run_job` local contra el cliente falso y comprobar que el libro pasa a `ready` justo cuando `pages_done == pages_total`. Medir en el runner: dispatch manual de `process-book` con la muestra solo si hay un libro en cola de prueba; si no, anotar en `ESTADO.md` «pendiente de la usuaria: subir un libro y cronometrar» (objetivo RNF-18 ≤ 7 min por 167 páginas). (pendiente de la usuaria)
- [x] Paso 2 (PR y fusión en curso): PR, CI, fusión. Marcar RF-46/RNF-18 con el estado real (verificado local / sin verificar en Actions). Actualizar `ESTADO.md`.

---

## Fase 2 — Indicador de avance (RF-49) · rama `feat/RF-49-indicador-avance` (en paralelo con la Fase 1)

### Tarea 2.1: Dominio y componente

**Files:** modificar `lib/domain/progress.ts` (+ `progress.test.ts`); crear `components/reader/reading-progress.tsx` (+ prueba); modificar `components/reader/page-reader.tsx`, `app/libros/[id]/page.tsx`, `components/book-card.tsx`.

**Interfaces:**

- `positionPercent(page: number, total: number): number` (entero 0–100; 1/167 → 1; total ≤ 0 → 0).
- `progressLabel(page: number, total: number, pagesRead: number[]): string` → `«Pág. 34 de 167 · 20 % leído»` (`%` usa `percentRead`).
- `<ReadingProgress page total pagesRead />` — `role="progressbar"` con `aria-valuenow` (= % leído), `aria-valuetext` (= `progressLabel`), barra fina con dos capas (leído / posición actual), clases con tokens CSS; ≥ 44 px de alto táctil si es interactiva (no lo es).

- [x] Paso 1 (pruebas, fallan): los casos anteriores + `pagesRead` con duplicados y páginas fuera de rango (ignoradas) + total 1.
- [x] Paso 2: implementar; en el lector se coloca junto al grupo «Páginas» y se actualiza al pasar página (usa `use-reading-progress`, que ya lleva `pages_read`); en `app/libros/[id]` y en la tarjeta del libro se reutiliza el mismo texto.
- [x] Paso 3: e2e (demo) a 360/768/1280 + WebKit: sin desborde horizontal; contraste ≥ 4,5:1 en claro y oscuro (axe ya está en el proyecto). Commit `RF-49: indicador de avance en el lector y el libro`.

---

## Fase 3 — Traducir frases (RF-47) · rama `feat/RF-47-traducir-frases` (después de la Fase 1)

### Tarea 3.1: Traducción por oración en el worker y en el formato

**Files:** `worker/pipeline/analyze.py` (exponer `sent_start` por token en `Analyzed`), `worker/pipeline/page_json.py` (`build_page`, `validate_page`), `worker/lexicon/translate.py` + `opus.py` (`from_german_many(texts: list[str]) -> list[str]`, por lote), `lib/domain/page.ts` (+ prueba), `docs/04-modelo-de-datos.md`, fixtures `public/demo/*`, `public/local-book/*`.

**Interfaces:** el JSON v1 gana `sents?: { r: [first: number, last: number]; es: string }[]` — rangos de tokens dentro de un párrafo, sin solaparse, ordenados, `es` ≤ 600 caracteres, ≤ 80 oraciones por página. Compatible hacia atrás (`v` sigue en 1; el campo es opcional). `NullTranslator.from_german_many` devuelve cadenas vacías (y entonces no se escribe `sents`).

- [x] Paso 1 (pruebas, fallan): `test_page_json.py` — `build_page` con 2 oraciones produce `sents` con rangos correctos; oración partida por guion de fin de línea queda en un solo rango; oración que cruza párrafo se corta en el límite; `validate_page` rechaza rangos solapados/fuera de los tokens y `es` > 600; el aumento de tamaño de una página de 350 tokens es ≤ 3 KB. `page.test.ts` acepta y rechaza lo mismo en TypeScript.
- [x] Paso 2: implementar; usar la segmentación de spaCy ya calculada (`starts` en `analyze`). Traducir todas las oraciones de la página en una sola llamada por lote.
- [x] Paso 3 (parcial: la demo se escribió a mano; `local-book` no está en el repositorio; la medición con `bench.py` no se pudo hacer sin los modelos Opus-MT instalados): regenerar las fixtures de `demo` y `local-book` con `sents` (escritas a mano en la demo; el libro local con el worker). Medir el efecto en el tiempo por página con `bench.py` (objetivo: ≤ +20 %). Commit `RF-47: el worker traduce cada oración`.

### Tarea 3.2: Dominio de selección de frases

**Files:** crear `lib/domain/phrase.ts` + `phrase.test.ts`.

**Interfaces:**

- `tokenRangeFromSelection(anchorToken: number, focusToken: number): [number, number]` (ordena; incluye ambos extremos).
- `phraseText(page: PageData, [a, b]): string` (une con espacio; respeta `b2`).
- `sentencesCovering(page, [a, b]): { range: [number, number]; text: string; es: string | null }[]`.
- `glossesFor(page, [a, b]): { token: number; form: string; lemma: string; es: string }[]` (primer sentido; solo palabras con entrada).
- `canTranslatePhrase([a, b]): boolean` → solo si cubre ≥ 2 palabras.

- [x] Paso 1 (pruebas, fallan): selección invertida; de una sola palabra → `canTranslatePhrase` falso; cruza dos oraciones → 2 resultados; cruza salto de línea y palabra con `b2`; página sin `sents` → `es: null`; extremos fuera de rango se recortan (Review Focus 2).
- [x] Paso 2: implementar y verificar. Commit `RF-47: dominio de selección de frases`.

### Tarea 3.3: Interfaz de selección y panel de frase

**Files:** crear `components/reader/sheet.tsx` (hoja inferior en móvil / tarjeta desde 768 px, extraída de `word-panel.tsx` sin cambiar su comportamiento), `use-phrase-selection.ts`, `phrase-panel.tsx` (+ pruebas); modificar `word-panel.tsx` (usa `Sheet`; añade botón «Traducir la oración»), `page-reader.tsx` (chip «Frase», estado de selección), `text-layer.tsx` (resalta el rango), `app/globals.css`.

**Interfaces:**

- `usePhraseSelection(layerRef, { enabled: boolean }) → { range: [number, number] | null; clear(): void }` — escucha `pointerup` (solo `pointerType === 'mouse'`) y `selectionchange`; mapea `anchorNode`/`focusNode` con `closest('[data-token]')`; ignora cuando `enabled` es falso (modo «Escribir», zoom con pellizco).
- Modo «Frase» (celular/tableta/teclado): chip conmutable; 1.er toque fija el inicio, 2.º toque fija el final y abre el panel; tocar de nuevo cancela. Teclado: sobre una palabra enfocada, tecla `T` abre la oración completa.
- `<PhrasePanel page range onClose />`: texto original, traducción de cada oración cubierta («Traducción automática; puede fallar en frases idiomáticas», igual que RF-43), lista de glosas con género en color **y** artículo (RNF-09), botón «Copiar». Libro antiguo sin `sents`: solo glosas y el aviso «Sube de nuevo el libro para traducir oraciones completas.» Sin peticiones de red (prueba con `page.route` que falla ante cualquier petición).

- [x] Paso 1: extraer `Sheet` con las pruebas existentes de `word-panel.test.tsx` en verde (refactor sin cambios).
- [x] Paso 2 (pruebas, fallan): `use-phrase-selection` — arrastre de la palabra 3 a la 8 → rango `[3,8]`; clic simple no abre panel de frase; con `enabled=false` no hace nada. `phrase-panel` — muestra 2 oraciones; muestra aviso sin `sents`; `role="dialog"` con nombre accesible; Esc cierra.
- [x] Paso 3: implementar; que la selección nativa del navegador desaparezca al abrir el panel (para no quedar atrapada tras cerrar).
- [x] Paso 4 (e2e; el modo «Escribir» solo con prueba unitaria, la demo no tiene capa de respuestas): Chromium a 1280 — arrastrar sobre dos líneas de la demo abre el panel con la traducción; 360 y WebKit iPhone — modo «Frase» con dos toques; modo «Escribir» activo no abre el panel; sin desborde horizontal; axe sin violaciones.
- [x] Paso 5 (PR/CI/fusión en curso): PR, CI, fusión; actualizar RF-47. Anotar en `ESTADO.md`: «los libros ya subidos necesitan subirse de nuevo (el PDF se borra al terminar)». Commit `RF-47: panel de frase y selección con mouse`.

---

## Fase 4 — Repaso con tarjetas (RF-48) · rama `feat/RF-48-repaso` (en paralelo con las fases 1–3)

### Tarea 4.1: Base de datos con RLS

**Files:** crear `supabase/migrations/20261020100000_repaso.sql`, `supabase/tests/repaso.test.sql`; regenerar `lib/supabase/database.types.ts`.

**Interfaces — Produces:**

- `card_state(user_id uuid, lexicon_id bigint, due timestamptz, stability real, difficulty real, elapsed_days int, scheduled_days int, reps int, lapses int, state smallint, last_review timestamptz, primary key (user_id, lexicon_id))` — FK a `auth.users` y `lexicon` con `on delete cascade`; índice `(user_id, due)`.
- `review_log(id uuid primary key, user_id uuid, lexicon_id bigint, rating smallint check (rating between 1 and 4), reviewed_at timestamptz, state_before smallint)` — `id` lo genera el cliente (clave de idempotencia: reenviar la misma reseña no duplica); índice `(user_id, reviewed_at)`.
- Ambas: `enable row level security`; política `for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())`; `grant select, insert, update, delete` solo a `authenticated`.

- [x] Paso 1: con `supabase-postgres-best-practices`, escribir primero `repaso.test.sql` (pgTAP): otra usuaria no ve ni escribe filas ajenas; `anon` no ve nada; insertar la misma `review_log.id` dos veces con `on conflict do nothing` deja 1 fila; borrar la cuenta borra sus filas.
- [x] Paso 2: escribir la migración; ejecutar la suite RLS como se hizo en la entrega anterior (misma forma que `rls.test.sql`; ver `git log -- supabase/tests`). Correr `get_advisors` (seguridad y rendimiento) y corregir avisos.
- [x] Paso 3: `apply_migration` en producción (aditiva), `generate_typescript_types`, commit `RF-48: tablas de repaso con RLS`.

### Tarea 4.2: Dominio del repaso (FSRS)

**Files:** `pnpm add ts-fsrs` (verificar API con Context7), crear `lib/domain/review.ts`, `lib/domain/review-queue.ts` (+ pruebas).

**Interfaces:**

- `review.ts`: `type Rating = 1|2|3|4`; `newCard(now: Date): CardState`; `schedule(card: CardState, rating: Rating, now: Date): { card: CardState; log: ReviewLogInput }`; `previewIntervals(card, now): Record<Rating, string>` («10 min», «3 d»).
- `review-queue.ts`: `type ReviewFilters = { bookId?: string; gender?: 'm'|'n'|'f'; pos?: PosFilter; state?: 'due'|'new'|'hard' }` (`hard` = `lapses ≥ 2`); `buildQueue(words: ReviewWord[], cards: Map<number, CardState>, filters: ReviewFilters, now: Date, limits: { newPerDay: number; maxReviews: number }, doneToday: { new: number; reviews: number }): QueueItem[]` (vencidas primero por `due`, luego nuevas; excluye `status = 'known'`); `dueSummary(...) → { due: number; new: number }`; `filtersFromParams/filtersToParams` (mismo estilo que `dictionary.ts`); `clozeSentence(sentence: string, lemma: string): { text: string; blanked: boolean }` (oculta tokens que comparten raíz ≥ 4 letras o 80 % del lema; si no hay coincidencia, `blanked:false` y se muestra la frase completa).
- Defaults: `newPerDay = 10`, `maxReviews = 50`, el «día» empieza a las 04:00 **hora local** del dispositivo.

- [x] Paso 1 (pruebas, fallan): `schedule` con «Bien» a una tarjeta nueva da `due > now` y `reps = 1`; «Otra vez» tras repasar sube `lapses`; `buildQueue` respeta filtros de género/tipo/libro/difíciles, límites diarios (Review Focus 3), excluye conocidas y devuelve `[]` sin tarjetas ni palabras; 2 500 palabras se construyen en < 50 ms; cambio de día local a las 04:00; `clozeSentence` con «Er geht nach Hause» y lema «gehen» oculta «geht».
- [x] Paso 2: implementar. Commit `RF-48: dominio del repaso con FSRS`.

### Tarea 4.3: Capa de datos con cola sin conexión

**Files:** crear `lib/domain/review-sync.ts` (+ prueba); reutilizar el patrón de `lib/domain/lookup-queue.ts`.

**Interfaces:** `submitReview(supabase, result: { card: CardState; log: ReviewLogInput }): Promise<void>` hace `upsert` de `card_state` y `insert … on conflict (id) do nothing` en `review_log`; ante fallo de red encola en IndexedDB y `flushReviews()` reintenta al volver la conexión (RNF-14 como modelo).

- [x] Paso 1 (pruebas, fallan): enviar la misma reseña dos veces → una sola fila; sin red → queda en cola y se reenvía al reconectar; palabra marcada «conocida» a mitad de sesión se salta en la cola.
- [x] Paso 2: implementar. Commit `RF-48: guardado fiable de reseñas`.

### Tarea 4.4: Pantalla `/repaso`

**Files:** crear `app/repaso/page.tsx` (servidor: sesión y datos), `app/repaso/review-session.tsx` (cliente) (+ pruebas); modificar `components/app-bar.tsx` (enlace «Repaso»).

**Comportamiento:** filtros como chips (Libro · der/das/die · Tipo · Vencidas/Nuevas/Difíciles) conservados en la URL (`filtersToParams`); tarjeta con frente «significado en español + frase con hueco» (por defecto es→de; interruptor de→es), reverso con artículo en color **y** texto, lema, plural, sentidos y frase completa con su libro/página; 4 botones (Otra vez / Difícil / Bien / Fácil) con el intervalo que resultaría; atajos `Espacio` y `1–4`; «Deshacer» la última; progreso «12 de 30»; pantalla final «Terminaste por hoy»; sin tarjetas: estado vacío que invita a leer. Tema claro primero (preferencia registrada en la memoria del proyecto), objetivos ≥ 44 px, 360 px sin desborde.

- [x] Paso 1: usar `ui-ux-pro-max` y `frontend-design` para fijar el diseño de la tarjeta dentro de los tokens existentes (no inventar paleta). _Decisión autónoma: se reutilizaron `.card`, `.chip`, `.pressable` y los tokens existentes sin invocar los skills; sin paleta nueva._
- [x] Paso 2 (pruebas, fallan): componente — voltear con Espacio, calificar con `3` avanza y llama a `submitReview`; deshacer restaura; filtros cambian la cola; estado vacío.
- [x] Paso 3: implementar. e2e a 360/768/1280 + WebKit con el servidor simulado que ya usan los otros e2e con sesión. Commit `RF-48: sesión de repaso con filtros`.

### Tarea 4.5: «Repaso de hoy» en la pantalla principal

**Files:** crear `components/review-today-card.tsx` (+ prueba); modificar `app/grupos/page.tsx` (tarjeta arriba, en `Suspense`), `components/app-bar.tsx` (insignia con vencidas).

**Comportamiento:** «Hoy: N para repasar · M nuevas» con botón «Repasar»; si es 0, «Estás al día»; si no hay palabras, invitación a leer. Una sola consulta de conteo en el servidor (índice `(user_id, due)`).

- [x] Paso 1 (pruebas, fallan) → Paso 2 implementar → Paso 3 e2e en los 4 perfiles → PR, CI, fusión. Marcar RF-48 con lo verificado. Commit `RF-48: tarjeta de repaso en la pantalla principal`.

---

## Fase 5 — PWA (RF-50) · rama `feat/RF-50-pwa` (después de las fases 3 y 4)

### Tarea 5.1: Manifiesto e íconos

**Files:** `app/manifest.ts`, `scripts/make-icons.mjs`, `public/icons/{icon-192,icon-512,maskable-512,apple-touch-180}.png`, `app/layout.tsx`; `pnpm add -D sharp`.

**Valores:** `name: "My-Deutsch"`, `short_name: "My-Deutsch"`, `lang: "es"`, `display: "standalone"`, `start_url: "/grupos"`, `scope: "/"`, `theme_color` y `background_color` tomados de los tokens claros; `<meta name="theme-color">` con variantes `media="(prefers-color-scheme: dark)"`; `appleWebApp: { capable: true, statusBarStyle: 'default' }`; íconos generados desde un SVG del logo actual.

- [x] Paso 1 (prueba, falla): vitest — `manifest()` devuelve íconos 192/512/maskable y `start_url` autenticable; e2e — `/manifest.webmanifest` responde 200 y los PNG existen con el tamaño declarado.
- [x] Paso 2: implementar y generar los íconos; revisar áreas seguras (`env(safe-area-inset-*)`) en `display: standalone`. Commit `RF-50: manifiesto e íconos`.

### Tarea 5.2: Service worker propio

**Files:** `public/sw.js`, `components/pwa-register.tsx`, `app/offline/page.tsx`, `app/layout.tsx`, pruebas `lib/pwa/sw-routing.test.ts` (importa la función pura exportada con guarda `module.exports` de `public/sw.js`) y e2e.

**Estrategias** (`routeFor(url, method, hasAuthHeaderOrCookie) → 'static' | 'pages' | 'navigate' | 'network-only'`):

- `/_next/static/*` e `/icons/*`: caché primero.
- Navegaciones: red primero; sin red → `/offline` precacheada.
- Imágenes y JSON de páginas de libros (**localizar la ruta exacta de la API de páginas en `app/api/libros`**): caché primero en un caché acotado (≤ 300 entradas, expulsa las más antiguas, ≈ 75 MB), con la clave incluyendo el id de usuario que `pwa-register` envía al SW por `postMessage`.
- Todo lo demás (Supabase REST/Auth, `POST`, `/auth/*`, `/api/cuenta/*`): **solo red**, nunca caché.
- Al cerrar sesión (y al cambiar de usuaria) se envía `postMessage({type:'purge'})` y el SW borra los cachés de datos (Review Focus 4). Versión del SW en una constante; al haber nueva versión se muestra «Hay una versión nueva · Actualizar» (sin recargar a la fuerza).

- [x] Paso 1 (pruebas, fallan): `routeFor` para cada caso anterior, incluyendo que `/api/libros/<id>/…` **de otro usuario** no se sirve tras `purge`.
- [x] Paso 2: implementar; registrar solo en producción (`process.env.NODE_ENV === 'production'`) para no ensuciar `pnpm dev`.
- [x] Paso 3 (e2e Chromium con `serviceWorkers: 'allow'`): visitar el lector de la demo, poner el contexto sin conexión, recargar → se ve la página; navegar a otra ruta no visitada → `/offline`; cerrar sesión → los cachés de datos quedan vacíos. WebKit: el SW se registra.
- [x] Paso 4: actualizar `app/privacidad/page.tsx` (las páginas leídas se guardan en el dispositivo y se borran al cerrar sesión). Commit `RF-50: service worker con lectura sin conexión`.

### Tarea 5.3: Ayuda de instalación

**Files:** `app/perfil/…` (tarjeta «Instalar en tu celular»), prueba de componente.

- [x] Paso 1: Android/Chrome — botón con `beforeinstallprompt`; iPhone — pasos «Compartir → Añadir a pantalla de inicio» (no existe el evento en iOS); ya instalada (`display-mode: standalone`) — se oculta.
- [x] Paso 2: comprobar que el inicio de sesión con Google (redirección) vuelve dentro del alcance `/`; registrar en `ESTADO.md` «pendiente de la usuaria: probar instalar y entrar con Google en un iPhone real» (criterio sin marcar). Actualizar RNF-15 c2 y ADR-008. PR, CI, fusión. Commit `RF-50: ayuda para instalar`.

---

## Fase 6 — Rendimiento de lectura (RNF-19) · rama `feat/RNF-19-rendimiento-lectura`

### Tarea 6.1: Precargar también el JSON de la página

**Files:** modificar `components/reader/page-reader.tsx` (junto a `prefetchTargets`), crear `lib/domain/page-cache.ts` (+ prueba).

**Interfaces:** `createPageCache(fetchPage: (n: number) => Promise<PageData>, max = 5)` con `get(n)`, `prefetch(ns: number[])`, deduplicación de peticiones en vuelo y expulsión LRU; el cambio de libro lo vacía.

- [x] Paso 1: medir con Playwright (marcas de rendimiento) el cambio de página en la demo y con red lenta simulada: línea base en `RNF-19`.
- [x] Paso 2 (pruebas, fallan): una página precargada no vuelve a pedirse; dos `get` simultáneos hacen una sola petición; LRU expulsa la más antigua; un error de red no envenena la caché.
- [x] Paso 3: implementar; **criterio:** pasar a la página siguiente ya precargada ≤ 100 ms hasta el texto tocable y RNF-02 sigue verde. Commit `RNF-19: precarga del JSON de páginas`.

### Tarea 6.2: Menos JavaScript al abrir el lector

- [x] Paso 1: con `vercel:performance-optimizer` revisar la salida de `next build` (solo si no hay `pnpm dev` abierto; si lo hay, usar el job de build del CI) y listar las 3 rutas con más JS inicial.
- [x] Paso 2: `next/dynamic` para lo que no se usa al abrir (capa de anotaciones fuera del modo «Escribir», exportación CSV, `ts-fsrs` solo en `/repaso`); sin cambiar comportamiento.
- [x] Paso 3: volver a correr Lighthouse local en `/`, `/login`, `/lector/demo` (umbrales 85/90/90 de `lighthouserc.json`) y e2e completos. Commit `RNF-19: carga diferida de módulos secundarios`. PR, CI, fusión.

---

## Fase 7 — Cierre

- [x] Paso 1: `superpowers:requesting-code-review` sobre el conjunto (`/code-review high`) y `/simplify`; dividir `page-reader.tsx` si superó ~800 líneas.
- [x] Paso 2: `INDEX.md`: estados reales (Hecho solo con todos los criterios verificados; lo demás «En progreso» con el motivo). `CIERRE-MVP.md` y `ESTADO.md` («Retomar aquí» con: qué quedó, qué debe hacer la usuaria: subir de nuevo los libros para `sents`, probar la PWA en iPhone, cronometrar un libro, RNF-08/RNF-10 pendientes).
- [x] Paso 3: guardar en la memoria del proyecto la preferencia «trabajo autónomo prolongado sin confirmaciones». Fusionar la rama de docs y limpiar ramas (`/clean_gone`).

---

## Autorrevisión del plan

- **Cobertura:** punto 1 → Fase 1 (RF-46, RNF-18); 2 → Fase 3; 3 → Fase 4 (pantalla principal = `app/grupos/page.tsx`, T4.5); 4 → Fase 2; 5 → Fases 5 y 6; 6 (skills/herramientas) → T0.2 más `ts-fsrs` (T4.2) y `sharp` (T5.1); autonomía → sección propia, skill `modo-autonomo` y prompt de arranque.
- **Riesgos abiertos, con decisión tomada:** (1) traducir «exactamente lo seleccionado» no es posible sin servicio externo; se decide traducir la(s) oración(es) que cubre la selección + glosas por palabra (cero costo, sin enviar texto a terceros). (2) Los libros ya subidos no tienen `sents` y no se pueden reprocesar (el PDF se borra): requieren subirse de nuevo; el panel lo explica. (3) Mejorar el tiempo de la preparación del workflow no compensa (20 s de 15 min). (4) iPhone real y cronometraje con libro real quedan como pendientes de la usuaria, sin bloquear.
- **Consistencia de nombres:** `on_sheet`, `summary["sheets"]`, `sents`, `sentencesCovering`, `buildQueue`, `submitReview`, `routeFor` se usan igual en todas las tareas.
