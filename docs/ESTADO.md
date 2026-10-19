# Retomar aquí (2026-10-19, noche, trabajo autónomo)

**PR #32 abierto, SIN fusionar** (el clasificador bloquea `gh pr merge`; hay que fusionarlo tú o añadir la regla de permiso): RF-44 tema claro/oscuro con selector (Sistema·Claro·Oscuro, sin destello), barra superior común (`components/app-bar.tsx`), rediseño minimalista de inicio, ingreso, grupos, grupo, perfil, diccionario, cabecera del lector y barra de herramientas del lector; tokens nuevos (`--danger`, chips `.chip`). Además en la misma rama: `ci.yml` (RNF-12), prueba e2e de objetivos táctiles (RNF-07, corrigió el logo de 28 px) y arreglo de ruff en el worker.
**Verificado:** suite 463/463 · e2e 110 pasadas (Chromium 360/768/1280 + WebKit iPhone) · cobertura de dominio 97,5 % · pytest 255 · ruff limpio · producción 200.
**Marcados Hecho:** RF-44, RF-42 (diseño), RNF-07, RNF-16. **RNF-12** en progreso (falta ver el primer run de CI en GitHub y proteger `main`).
**Sigue pendiente y necesita a la usuaria:** Google OAuth (RF-40 c3, RF-03), iPhone real (RNF-15), contraseña bcrypt (RNF-05 c1), revisar con datos reales las pantallas de grupo/biblioteca a 360 px en ambos temas, comprobar variables de Vercel (RNF-16 c4).

# Antes (2026-10-19, tarde)

**Hecho hoy (en `main`):** RNF-05 cabeceras de seguridad (PR #28) · RF-42 selector de archivo de la subida (PR #29). **Verificado:** suite RLS (`rls.test.sql`, 22 pruebas) pasa contra la base real, con rollback · auditoría responsive de 9 pantallas (`/`, login, registro, privacidad, grupos, grupo, diccionario, perfil, lector demo) a 360/768/1280 px: 0 desbordes y 0 controles < 44 px · e2e 82/82 (Chromium + WebKit iPhone). Usuario y grupo de prueba creados y borrados (quedan solo las 2 cuentas reales).
**Actualización (usuaria, 2026-10-19):** subió un libro real en producción y el flujo completo funciona («sirve perfecto»). **Google OAuth (RF-40 c3) queda pendiente para después.** La usuaria no tiene iPhone: RNF-15 se verifica con WebKit emulado (e2e iPhone 13, ya verde) y la prueba en iPhone real se hará con sus compañeros cuando la app esté terminada.
**Lo que sigue:** revisar con la usuaria qué falta para cerrar la entrega (RF-42 revisión final, RNF-16, RNF-12) y marcar Hecho lo que corresponda en INDEX.
**Sin verificar (la parte (a) ya quedó resuelta arriba):** (a) **humo de extremo a extremo en producción** (subir `samples/Der Schatz-3-7.pdf` → En cola → Procesando → Listo → leer → reprocesar para ver RF-24): el clasificador bloqueó la subida a producción; en local `/api/libros/finalizar` da 500 porque no hay `SUPABASE_SERVICE_ROLE_KEY` (esperado) · (b) RNF-05 criterio 1 (bcrypt): las 2 cuentas reales entran con Google y no tienen contraseña · (c) RF-40 criterio 3 (publicar el cliente OAuth de Google) · (d) RNF-15: Safari iPhone real y Google por redirección.

# Antes (2026-10-19, tras la noche autónoma)

**Todo en `main` (PR #15–#25 fusionados) y migraciones aplicadas a Supabase:** RF-24 verbos separables · RF-42 diseño (1.ª entrega) · RF-20 última página y % leído · RF-27 diccionario personal (`record_lookup` + cola offline) · RF-29/30/31 pantalla `/diccionario` · RF-28 palabras vistas en el lector · RF-25 palabra no encontrada · RF-15 quitar libro + limpieza RN-11 (`mantenimiento.yml`, ya probado en Actions) · RF-19 zoom · RF-09/10 administrar y salir de grupos · RF-05 perfil y eliminar cuenta. Suite 452/452, e2e 82/82 (Chromium 360/768/1280 + WebKit iPhone).

**Alcance recortado por la usuaria (2026-10-19): NO se hace en esta entrega** los ejercicios y lo opcional: RF-33/34/35 y RNF-14 (respuestas escritas; el avance quedó en `git stash` «WIP RF-33», recuperable con `git stash pop`), RF-18, RF-32, RF-37, RNF-08, RNF-10, RNF-13. Solo funcionalidades core.

**Lo que falta para cerrar (en este orden):** (1) revisión final del diseño en pantallas con sesión (grupos, grupo, subida, biblioteca, diccionario, perfil) a 360 px, terminando RF-42; (2) RNF-15 **solo web** (la usuaria descartó la PWA instalable): comprobar Safari iPhone, inicio de sesión con Google por redirección, safe areas y gestos; (3) RF-36/RNF-07 auditoría responsive de todas las pantallas; (4) cierre de RNF-05/06/16 y RF-40 (verificar RLS completo con `rls.test.sql`, cabeceras, página de privacidad lista para publicar Google OAuth); (5) humo de extremo a extremo con un libro real (subir → procesar → leer) y reprocesar el libro de muestra para ver RF-24; (6) actualizar INDEX (marcar Hecho o Descartado lo que corresponda) y este archivo.

# Antes (2026-10-19, noche autónoma)

**PR abiertos, SIN fusionar (el clasificador bloquea `gh pr merge` y `apply_migration`; hay que hacerlo tú):** fusionar en este orden en GitHub: **#15** RF-24 (verbos separables, 29/30 = 97 %) · **#16** RF-42 (diseño visual, primera entrega: tokens, tipografía Bricolage+Figtree, botones con carga/pulsado, inicio interactivo, lector) · **#17** RF-20 (recordar última página + «% leído» real; sin migración) · **#18** RF-27 (diccionario personal: cola offline + `record_lookup`; apilado sobre #17, cambiar su base a `main` tras fusionar #17).
**Acción tuya:** aplicar a Supabase `supabase/migrations/20261019100000_registrar_consulta.sql` (SQL Editor o `apply_migration`); probada en rollback contra la base real. Sin ella las consultas quedan en la cola del navegador.
**Qué verificar con sesión real:** RF-20 (leer en un dispositivo, abrir en otro ≤ 5 s), RF-27 (consultar palabras → filas en `user_words`), UI de grupos/biblioteca/subida en iPhone 360 px (solo se auditaron las rutas públicas). Reprocesar un libro para ver RF-24.
**Siguiente:** RF-30/31 (pantalla del diccionario personal), RF-28 (palabras ya vistas en el texto), terminar RF-42 (grupo, subida, estados de éxito/error), RF-15.

# Antes (2026-10-18, cierre de la entrega 2)

**En `main` (PR #1–#11), desplegado en https://my-deutsch.vercel.app:** ingreso (correo y Google), grupos, lector (colores de género, plurales RF-41), worker (OCR → JSON + WebP, léxico, traducción Argos), **entrega 2 completa**: subida reanudable (TUS), `POST /api/libros/finalizar` (huella SHA-256 en el servidor, RN-02), `process-book.yml` disparado con `workflow_dispatch` (ADR-006; el token de Vercel necesita «Actions: Read and write»), estado en vivo, biblioteca con portadas, «Reintentar» (`request_retry`), lector `/libros/[id]`. Migraciones aplicadas al proyecto Supabase real `rgzguilhkilaizamvyuq`. Suite 377/377, typecheck y lint limpios.

**RF-43 (calidad de las traducciones) — HECHO y fusionado (PR #13, 2026-10-19).** Opus-MT reemplaza a Argos (ADR-007); la usuaria probó el libro de muestra en la app y aprobó las traducciones. En Actions: 10 páginas en 115 s (≈ 38 min por 200 páginas). Para ver las traducciones nuevas hay que (re)procesar los libros; la base de datos de prueba se vació el 2026-10-19 (quedan solo las 2 cuentas; 21 archivos viejos en Storage que ella puede borrar desde el panel). **Siguiente: RF-24 (verbos separables):** hoy `steht … auf` solo se une a _aufstehen_ si spaCy marca la partícula (`svp`); falta una regla de respaldo (partícula al final de la oración + compuesto existente en el léxico) y reproducirlo antes en un libro real (la usuaria notó que solo traduce el verbo sin el prefijo).

**Después de RF-24: RF-42 (diseño visual y experiencia móvil), aprobado por la usuaria.** UI «súper interactiva y bonita», **primero solo modo claro** (oscuro después); orden: inicio, ingreso/registro, grupos, biblioteca, subida, lector; iPhone a 360 px; colores de género intactos (contraste ≥ 4,5:1, RNF-09). Flujo: `brainstorming` (con la skill frontend-design / ui-ux-pro-max) → `writing-plans` → ejecución. Después: RF-20 (última página y progreso real), diccionario personal (RF-27), RF-15 (quitar libros).

**Sin verificar de extremo a extremo (necesita sesión real):** el flujo subir → En cola → Procesando → Listo → leer con `samples/Der Schatz-3-7.pdf`; la usuaria vio fallar el disparo antes de ADR-006 y debe reintentar el libro de prueba con «Reintentar» (si falla, el log de Vercel muestra «dispatch: GitHub respondió con estado NNN»: 401/403/404 = token o permisos); reanudar tras cortar la conexión en un iPhone; RLS real con un segundo usuario; diseño a 360/768/1280 px y WebKit; RNF-04 en Actions.

**Pendientes diferidos de seguridad (RF-43, revisión automática del 2026-10-19):** (1) el registro `pin.json` del modelo convertido lo genera el propio `provision`: detecta archivos dañados o cambiados, pero no a quien pueda reescribir también ese registro (p. ej. una caché de Actions envenenada); para cerrarlo, fijar en `MODEL_PINS` el SHA-256 de los archivos **convertidos** (si la conversión es determinista con la versión fija de ctranslate2) o cachear solo los archivos fuente ya fijados y convertir siempre; (2) la carpeta de preparación `.<modelo>.partial` y el destino no se revisan como enlaces simbólicos antes de `rmtree` (usar `tempfile.mkdtemp` en `models_dir`); (3) `MYDEUTSCH_MODELS_DIR` debería requerir un indicador explícito de desarrollo. Riesgo hoy bajo: quien escriba en la caché del repositorio ya puede cambiar el workflow y leer sus secretos, y las cachés están acotadas por rama.

**Pendientes diferidos** (detalle abajo en esta sección o en las revisiones): miniatura de portada en el worker, paso `failure()`/`cancelled()` del workflow, cercar escrituras del worker por `job_id`, limpieza de solicitudes abandonadas, `0 % leído` fijo hasta RF-20, `git config user.name` sin configurar (autores «unknown»), y el falso positivo de `guard-bash` con la clase CSS de recorte de texto (afinar su patrón; no desactivar el hook).

**Cómo trabajar aquí:** pruebas pgTAP con `execute_sql` del MCP de Supabase (terminan en rollback; no hay Supabase CLI); no correr `pnpm build` con `pnpm dev` abierto (copiar el proyecto a una carpeta temporal e instalar con `pnpm install --offline`; ojo: no excluir `lib/supabase` al copiar); worker en Docker (`./worker/run.sh uv run pytest`). Cada cambio cita su RF/RNF; sin atribución a Claude en commits ni PR.

**Humo manual de la entrega 2 (usuaria), con `samples/Der Schatz-3-7.pdf`:** (1) subir a un grupo → «En cola» → «Procesando X/Y» → «Listo» → abrir en `/libros/[id]`; (2) subir el mismo PDF a otro grupo → disponible al instante; (3) cortar la conexión a mitad de subida y reanudar; (4) subir un archivo que no es PDF → rechazo con mensaje; (5) con un segundo usuario que no es del grupo, abrir `/libros/[id]` → 404; (6) como miembro que no subió el libro, un libro en «Error» no muestra «Reintentar».

Detalle histórico de las tareas 2a–2d, rulings y revisiones: planes en `docs/superpowers/plans/` y `docs/superpowers/specs/2026-10-18-subida-de-libros-design.md`; el texto largo anterior de este archivo está en el historial de git.

---

**Fase actual:** 2 · Spike técnico — **terminado** (rama `feat/RNF-03-spike-ocr`, resultados en `docs/spike-fase-2.md`).
**Hecho:** requisitos de la Fase 1 aprobados (2026-10-17) + RF-38 y RF-39. Spike: RNF-03 98,5 % / 99,0 % umlauts, RF-38 10/10 páginas, RF-39 96,7 %, RF-23 97,4 %. ADR-005 aceptada. Repositorio público (nota en ADR-002).
**Siguiente paso:** Fase 3 (MVP vertical). Hecho: contratos de BD, ingreso, grupos y el lector sobre un ejemplo sintético (ver «Lector»). Siguiente: subir libros y worker (RF-11, RF-12), biblioteca del grupo (RF-14) y conectar el lector a libros reales (`/libros/[id]`); diccionario personal (conectar `recordLookup` a `user_words`, RN-05).
**Google OAuth:** cliente en modo _Testing_ (solo usuarios de prueba). Para publicarlo hace falta la página de inicio y la política de privacidad en el dominio de Vercel → proponer RF-40 (página de privacidad) al iniciar la Fase 3.
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
- **Traducción automática (actualizada por RF-43/ADR-007):** Opus-MT instalado con `./worker/run.sh uv run --extra opus --extra opus-convert python -m lexicon.opus provision` (≈ 3 min la primera vez); procesar con traducción: `./worker/run.sh uv run --extra opus python -m pipeline.run ...` (≈ 137 s por 10 páginas). 98,7 % de las palabras con entrada tienen significado; todos son traducción automática. (Antes: Argos, ≈ 275 s por 10 páginas.)
- **Entrega 2:** `submit_book` en estado pendiente + hash calculado por el worker (RN-02), workflow `process-book.yml`, subida a Storage, pantalla de subida, estado y biblioteca (RF-11, RF-13, RF-14).
- Revisar: algunas palabras (máx. 4,7 % del ancho) quedan desalineadas frente a la tinta; y 12 % de las mayúsculas a mitad de oración no están en Wiktionary.

## Plurales y compuestos (2026-10-17, rama `feat/RF-41-marcar-plurales`)

- RF-41 (nuevo, a pedido de la usuaria): interruptor «Marcar plurales» en amarillo con borde superior y etiqueta «plural» en el panel; independiente de «Colorear sustantivos».
- Por qué algunos sustantivos no se colorean: los nombres propios no llevan género (RN-01), los de solo plural no tienen género, y ~12 % de las mayúsculas a mitad de oración no está en Wiktionary. Mejora: los **sustantivos compuestos** sin entrada propia toman el género y el plural de su última palabra (_Kunst|schatz_ → der). En las 10 páginas de prueba, las palabras con entrada subieron de 94,6 % a 96,2 %.
- **Reprocesar** los libros ya procesados para que los plurales iguales al singular y los compuestos queden bien (≈ 1 minuto por 10 páginas).
- El servidor de desarrollo (`pnpm dev`) puede servir un CSS antiguo: si no ves el amarillo, reinícialo.
