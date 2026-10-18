# Retomar aquí (2026-10-18)

**Hecho y fusionado en `main` (PR #1–#8):** ingreso con correo y Google, grupos, lector (panel, colores de género, plurales en amarillo RF-41), esquema BD con RLS, worker local (OCR → JSON v1 + WebP, reanudable, léxico SQLite de Wiktionary, traducción Argos con huella fijada). Sitio: https://my-deutsch.vercel.app (solo la app Next; `vercel.json` con un servicio).

**Entrega 2 (rama `feat/RF-11-subida-de-libros`, diseño en `docs/superpowers/specs/2026-10-18-subida-de-libros-design.md`, aprobado por la usuaria).** Se parte en 2a–2d; un plan por parte en `docs/superpowers/plans/`.
- **2a HECHA (migraciones aplicadas al proyecto Supabase real `rgzguilhkilaizamvyuq`, pgTAP 8/8 + 21/21 + 22/22):** `submit_book(grupo, título, ruta)` solo crea una solicitud pendiente (`book_submissions`); `finalize_submission(id, sha256)` y `reject_submission(id, motivo)` son solo del service role y vinculan/crean el libro con la huella calculada por el servidor (RN-02); `join_group` limita los intentos fallidos (RNF-17; un código inexistente devuelve `null`, la app lo trata como «Código no válido»).
- **2b HECHA en código (rama sin fusionar; plan en `docs/superpowers/plans/2026-10-18-entrega-2b-worker-publica-en-supabase.md`):** `worker/publish/` (cliente de Supabase, `remap_page`, `run_job`, `python -m publish`), ganchos `on_start`/`on_page` en `process_pdf`, migración `jobs.pages_total` (aplicada al proyecto real, pgTAP 3/3) y `process-book.yml` (`repository_dispatch` + `workflow_dispatch`, un grupo de concurrencia por libro). Pruebas del worker 185/186 (la que falla, `test_argos_translates_a_simple_word`, es previa: necesita `--extra argos`). **Sin ejecutar aún en Actions ni contra la base real** (necesita 2c para crear el libro; humo manual descrito en el plan, tarea 7). Acciones fijadas por SHA (checkout, cache, setup-uv) con `persist-credentials: false`; el volcado de kaikki.org y la caché del léxico no se verifican por huella (el volcado cambia cada semana; el SQLite se abre en solo lectura y las acepciones pasan por el validador): riesgo aceptado, a revisar antes de abrir el repositorio a colaboradores. Un libro que quede en `processing` por caída del runner no se reintenta solo.
- **2c HECHA en código (plan `docs/superpowers/plans/2026-10-18-entrega-2c-api-verifica-huella-y-dispara.md`):** `POST /api/libros/finalizar` (`app/api/libros/finalizar/route.ts`) autentica con la sesión, comprueba que la solicitud es propia y pendiente, calcula el SHA-256 por flujo (`lib/server/sha256-stream.ts`), llama a `finalize_submission` con la service role (`lib/supabase/admin.ts`) y dispara `process-book.yml` (`lib/server/github-dispatch.ts`). Suite 171/171, typecheck y lint limpios. **Sin ejecutar contra Supabase/GitHub reales** (humo manual en RF-11). Brecha: si el disparo falla el libro queda `queued` hasta el «Reintentar» de 2d. `GITHUB_DISPATCH_REPO` es opcional (por omisión `Ally2403/My-Deutsch`).
- **2d:** pantalla de subida reanudable con progreso (RF-11), estado «Procesando X/Y» (RF-13), biblioteca del grupo y `/libros/[id]` (RF-14).
- **Hecho por la usuaria (2026-10-18):** `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están en Vercel y en los secretos de GitHub Actions (antes: guardar `SUPABASE_SERVICE_ROLE_KEY` en Vercel (variable de servidor) y `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` como secretos de GitHub Actions. Claude nunca lee ni escribe esos valores y mantiene `.env.example`).
- Pruebas pgTAP: no hay Supabase CLI; se ejecutan con `execute_sql` del MCP de Supabase sobre el proyecto (terminan en `rollback`). Las pruebas de `rls.test.sql` asumen que no hay grupos ni libros reales.
- Rama sin fusionar ni publicar: pendiente la revisión final y el PR.
Cada cambio cita su RF/RNF. Flujo: `writing-plans` → TDD → verificación.

**Cómo trabajar aquí:** worker en Docker (`./worker/run.sh uv run pytest`; con traducción `uv run --extra argos`; para reprocesar un libro desde cero, la opción force de `pipeline.run`); léxico en `worker/.local/lexicon.sqlite` (`python -m lexicon.build`, ~45 s); libro de prueba en `samples/Der Schatz-3-7.pdf` (no se versiona); ver páginas reales en `/lector/local` tras `node scripts/link-local-book.mjs`. Verificar producción desde una copia o puerto aparte, sin `pnpm build` mientras ella tiene `pnpm dev` (comparten `.next`; reiniciar `pnpm dev` si no ve estilos nuevos).

**Sin verificar todavía:** gesto de deslizar y borde de iOS en un iPhone real; pintado del resaltado en iOS; calidad de las traducciones automáticas con una persona; RNF-04 en GitHub Actions; alineación de unas pocas palabras (máx. 4,7 % del ancho); tiempo de activación del interruptor de plurales.

---

**Fase actual:** 2 · Spike técnico — **terminado** (rama `feat/RNF-03-spike-ocr`, resultados en `docs/spike-fase-2.md`).
**Hecho:** requisitos de la Fase 1 aprobados (2026-10-17) + RF-38 y RF-39. Spike: RNF-03 98,5 % / 99,0 % umlauts, RF-38 10/10 páginas, RF-39 96,7 %, RF-23 97,4 %. ADR-005 aceptada. Repositorio público (nota en ADR-002).
**Siguiente paso:** Fase 3 (MVP vertical). Hecho: contratos de BD, ingreso, grupos y el lector sobre un ejemplo sintético (ver «Lector»). Siguiente: subir libros y worker (RF-11, RF-12), biblioteca del grupo (RF-14) y conectar el lector a libros reales (`/libros/[id]`); diccionario personal (conectar `recordLookup` a `user_words`, RN-05).
**Google OAuth:** cliente en modo *Testing* (solo usuarios de prueba). Para publicarlo hace falta la página de inicio y la política de privacidad en el dominio de Vercel → proponer RF-40 (página de privacidad) al iniciar la Fase 3.
**Pendiente de verificar:** RNF-04 en GitHub Actions (estimado 8–17 min por 200 páginas).
**Bloqueos:** faltan el proyecto de Supabase y el cliente OAuth de Google (Fase 3).

## Pendientes de seguridad (Fase 3)
- **`submit_book` confía en el SHA-256 que envía el cliente (RN-02):** quien conozca la huella de un libro, sin tener el archivo, podría vincularlo a su grupo. Antes de habilitar RF-11, `submit_book` debe dejar el libro en estado pendiente y vincularlo al grupo solo cuando el worker calcule la huella del archivo subido y coincida (el worker solo calcula el hash, no repite el OCR). Hoy no es explotable: la base está vacía y no hay interfaz.
- **Límite de intentos en `join_group`** (código de 8 caracteres): proponer un requisito nuevo.

## Verificación en navegador (2026-10-17, localhost, 360 px)
- RF-02 criterio 2: credenciales incorrectas → "Correo o contraseña incorrectos" ✅
- RF-01 criterio 3: contraseña sin número → error antes de enviar, sin petición a Supabase ✅
- RF-03: "Continuar con Google" redirige a accounts.google.com con el redirect URI de Supabase, sin ventana emergente ✅ (falta completar el ingreso con una cuenta de prueba)
- RN-03: `/grupos` sin sesión → `/login?next=/grupos` ✅
- RF-40 criterio 1: `/privacidad` legible a 360 px ✅
- Sin verificar: registro con correo real (RF-01 c1/c2), ingreso exitoso (RF-02 c1, c4), recuperar contraseña (RF-04), Google completo, 768/1280 px y WebKit.

## Verificación de grupos en navegador (2026-10-17, localhost, 360 px, usuarios de prueba ya borrados)
- RF-06 ✅ (nombre validado 3–60 en pruebas unitarias; creador como administrador; código de 8 caracteres y botón "Compartir enlace").
- RF-07 criterios 1–3 ✅ (con enlace o código; código inexistente → "Código no válido"; unirse dos veces no duplica; sin sesión el enlace pasa por /login y vuelve). Criterio 4 (grupo lleno, 50) sin probar en navegador.
- RF-08 ✅ (nombre, foto/inicial y rol; sin vocabulario ni progreso).
- RF-02 c1 ✅ ingreso correcto; RF-04 c1 ✅ cerrar sesión redirige a /login.
- Corregido: `createClient()` del servidor llama a `connection()` (error `Date.now()` de Cache Components).

## Lector (2026-10-17, rama `feat/RF-17-lector`, plan en `docs/superpowers/plans/2026-10-17-lector-de-paginas.md`)
- Formato del JSON de página validado por `parsePage` (`lib/domain/page.ts`); se añadió `f` (forma del token) y se fijó que `lines`/`paragraphs` son rangos inclusivos (`docs/04`).
- Ejemplo de prueba: 3 páginas sintéticas en `public/demo/` (generadas con `worker/tools/make_demo_pages.py`), visibles en `/lector/demo` (ruta pública provisional).
- RF-22 Hecho. RF-16, RF-17, RF-21, RF-26, RNF-01 y RNF-09 En progreso: cada requisito detalla en su archivo qué criterios se verificaron y cuáles no.
- Medidas (Chromium, CPU ×4, 100 toques): p95 de apertura del panel 45–131 ms. Alineación texto/imagen ≤ 2 %. axe-core sin violaciones serias.
- **Sin verificar:** gesto de deslizar y borde de iOS en un iPhone real; pintado del resaltado en iOS (WebKit emulado en Windows: 148–320 ms); páginas reales del worker; pellizco para zoom; simulación de deuteranopía; vista de dos páginas.
- Pruebas e2e: `pnpm e2e` (reutiliza el servidor del puerto 3000) o `E2E_BASE_URL=http://localhost:3100 pnpm e2e` contra `next start`. El servidor de desarrollo servía un CSS desactualizado; verificar siempre contra una build.

## Worker (2026-10-17, rama `feat/RF-12-worker-pipeline`, plan en `docs/superpowers/plans/2026-10-17-worker-pipeline-local.md`)
- Entrega 1 hecha: `worker/pipeline/` (OCR → tokens → análisis → JSON v1 + WebP, reanudable por página) y `worker/lexicon/` (léxico SQLite desde Wiktionary: 496 059 formas, 90 892 entradas, se construye en ~45 s).
- Sobre el PDF de prueba (10 páginas): ≈ 5 s por página en Docker, palabras 95,6 %, umlauts/ß 98,5 %, 94,6 % de palabras con entrada de léxico, WebP ≤ 249 KB. Lector local: `node scripts/link-local-book.mjs` y abrir `/lector/local` (404 en producción).
- Seguridad: Tesseract con límite de tiempo y presupuesto total por libro, hoja y página con tope de tamaño, validador Python tan estricto como `parsePage`, modelo Argos solo instalado y verificado por SHA-256 (sin descargas en uso).
- **Traducción automática hecha:** Argos en→es instalado con huella SHA-256 fijada (`python -m lexicon.translate provision`); procesar con traducción: `./worker/run.sh uv run --extra argos python -m pipeline.run ...` (≈ 275 s por 10 páginas; la primera vez, ~6 min de instalación). 98,3 % de las palabras con entrada tienen significado; todos son traducción automática.
- **Entrega 2:** `submit_book` en estado pendiente + hash calculado por el worker (RN-02), workflow `process-book.yml`, subida a Storage, pantalla de subida, estado y biblioteca (RF-11, RF-13, RF-14).
- Revisar: algunas palabras (máx. 4,7 % del ancho) quedan desalineadas frente a la tinta; y 12 % de las mayúsculas a mitad de oración no están en Wiktionary.

## Plurales y compuestos (2026-10-17, rama `feat/RF-41-marcar-plurales`)
- RF-41 (nuevo, a pedido de la usuaria): interruptor «Marcar plurales» en amarillo con borde superior y etiqueta «plural» en el panel; independiente de «Colorear sustantivos».
- Por qué algunos sustantivos no se colorean: los nombres propios no llevan género (RN-01), los de solo plural no tienen género, y ~12 % de las mayúsculas a mitad de oración no está en Wiktionary. Mejora: los **sustantivos compuestos** sin entrada propia toman el género y el plural de su última palabra (*Kunst|schatz* → der). En las 10 páginas de prueba, las palabras con entrada subieron de 94,6 % a 96,2 %.
- **Reprocesar** los libros ya procesados para que los plurales iguales al singular y los compuestos queden bien (≈ 1 minuto por 10 páginas).
- El servidor de desarrollo (`pnpm dev`) puede servir un CSS antiguo: si no ves el amarillo, reinícialo.

