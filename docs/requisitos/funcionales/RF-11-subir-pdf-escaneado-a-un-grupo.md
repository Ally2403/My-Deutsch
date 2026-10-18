# RF-11 — Subir PDF escaneado a un grupo

| Campo | Valor |
|---|---|
| **ID** | RF-11 |
| **Título** | Subir PDF escaneado a un grupo |
| **Módulo** | M-3 Biblioteca |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | En progreso |
| **Dependencias** | [RF-07](RF-07-unirse-a-un-grupo.md) |
| **Reglas de negocio** | RN-02, RN-10 |

## Descripción
Un miembro sube un PDF a un grupo indicando el título del libro. El sistema calcula su huella, valida los límites y lo encola para procesamiento, o lo vincula directamente si ya existía.

## Justificación
Es la entrada de contenido de toda la aplicación.

## Criterios de aceptación
1. Un PDF válido (≤ 50 MB, ≤ 400 páginas) queda en estado "En cola" y aparece en la biblioteca del grupo.
2. Un archivo que no es PDF, o que supera los límites, se rechaza antes de subirlo completo, con un mensaje que indica el límite.
3. Si la huella ya existe (RN-02), el libro queda disponible al instante, sin reprocesarse.
4. Si el usuario ya tiene un libro en procesamiento, se muestra "Espera a que termine tu libro actual".
5. La subida muestra una barra de progreso y se puede reanudar si se corta la conexión en móvil.

## Verificación
Entrega 2a (2026-10-18, solo base de datos, pgTAP sobre el proyecto Supabase; `supabase/tests/book_submissions.test.sql`, 21/21):

3. ✅ (parte de base de datos) Con la misma huella el libro se vincula al otro grupo sin crear un `job` nuevo; la huella la calcula el servidor (RN-02).
4. ✅ (parte de base de datos) `submit_book` rechaza con `busy` si hay un libro en procesamiento o una solicitud pendiente reciente (15 min); se vuelve a comprobar al finalizar.
Entrega 2c (2026-10-18, `POST /api/libros/finalizar`; pruebas Vitest con dobles, 171/171 en la suite):

- ✅ (pruebas) La huella se calcula en el servidor leyendo el PDF por flujo; un archivo sin cabecera `%PDF`, vacío o de más de 50 MB se rechaza y se borra de Storage; solicitud ajena o ya procesada no llega a `finalize_submission`.
- ✅ (pruebas) Criterio 3: libro reutilizado → no se dispara el workflow y se borra el PDF subido. Criterio 4: `busy` → HTTP 429 (la pantalla mostrará «Espera a que termine tu libro actual»).
- Sin verificar: criterio 1 y la ruta contra Supabase/GitHub reales (necesita sesión y claves de la usuaria: subir un PDF pequeño, llamar a la ruta y ver `jobs` en `queued` y una ejecución de `process-book`). Sin sesión, la ruta responde 307 a `/login` (proxy, RN-03).
- Brecha conocida: si el disparo a GitHub falla, el libro queda `queued` (API: 502 `dispatch_failed` con `book_id`) hasta que 2d agregue «Reintentar».

Criterios 2 (rechazo en el navegador antes de subir) y 5 (barra y reanudación): sin verificar (pantalla de subida, entrega 2d).
