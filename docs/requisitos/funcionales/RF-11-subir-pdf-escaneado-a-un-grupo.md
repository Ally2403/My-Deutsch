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
1, 2 y 5: sin verificar (necesitan la ruta de API y la pantalla de subida, entregas 2c y 2d).
