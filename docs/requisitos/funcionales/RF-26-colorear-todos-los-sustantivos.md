# RF-26 — Colorear todos los sustantivos

| Campo | Valor |
|---|---|
| **ID** | RF-26 |
| **Título** | Colorear todos los sustantivos |
| **Módulo** | M-5 Lector |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | En progreso |
| **Dependencias** | [RF-22](RF-22-mostrar-genero-y-color-del-sustantivo.md) |
| **Reglas de negocio** | RN-01 |

## Descripción
Un interruptor del lector colorea todos los sustantivos de la página según su género, con un resaltado semitransparente sobre la imagen original (o con color del texto en el modo lectura). La preferencia se recuerda.

## Justificación
Ver todos los géneros a la vez ayuda a memorizarlos mientras se lee.

## Criterios de aceptación
1. Al activarlo, todos los sustantivos con género conocido de la página se resaltan con su color en < 100 ms.
2. El resaltado no impide leer el texto original (opacidad ≤ 35 %).
3. La preferencia persiste entre páginas, libros y sesiones.

## Verificación
Verificado el 2026-10-17 con las 3 páginas sintéticas de `public/demo/` (`/lector/demo`): Playwright en Chromium a 360, 768 y 1280 px contra la build de producción, y WebKit con perfil iPhone 13 emulado en Windows. No se ha probado con un libro real ni en un iPhone físico.

1. ⚠ Parcial: el DOM se actualiza en 3–6 ms y el pintado tarda 16–35 ms en Chromium. En el WebKit emulado en Windows el pintado llega a 148–320 ms; no se ha medido en un iPhone real.
2. ✅ Opacidad del resaltado 0,3 (≤ 0,35).
3. ✅ La preferencia persiste entre páginas y recargas (`localStorage`, con respaldo en memoria si está bloqueado).
