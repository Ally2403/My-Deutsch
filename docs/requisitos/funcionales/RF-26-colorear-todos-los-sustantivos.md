# RF-26 — Colorear todos los sustantivos

| Campo | Valor |
|---|---|
| **ID** | RF-26 |
| **Título** | Colorear todos los sustantivos |
| **Módulo** | M-5 Lector |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
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
