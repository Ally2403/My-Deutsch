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
