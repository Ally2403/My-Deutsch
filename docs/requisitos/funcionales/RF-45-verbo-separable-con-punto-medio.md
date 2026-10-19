# RF-45 — Verbos separables con punto medio en el panel

| Campo | Valor |
|---|---|
| **ID** | RF-45 |
| **Título** | Verbos separables con punto medio en el panel |
| **Módulo** | M-5 Lector |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-24](RF-24-detectar-verbos-separables.md), [RF-21](RF-21-consultar-palabra.md) |
| **Reglas de negocio** | RN-07 |

## Descripción
Al tocar una palabra que es un verbo separable (*trennbares Verb*), el panel muestra el lema con un punto medio entre la partícula y la raíz: **vor·gehen**, **auf·stehen**, para recordar que se separa. Solo se aplica al panel de la palabra tocada, no a otras listas.

## Justificación
Solicitado por la usuaria (2026-10-19): reconocer de un vistazo que un verbo es separable ayuda a memorizarlo y a armar la oración.

## Criterios de aceptación
1. Al tocar cualquier forma de un verbo separable (*gehe vor*, *vorgegangen*, *vorgehen*), el encabezado del panel muestra el lema con punto medio (*vor·gehen*).
2. Los verbos no separables (*beginnen*, *verstehen*) y las palabras que no son verbos no llevan punto medio; las partículas ambiguas (*durch-*, *über-*, *um-*, *unter-*, *wieder-*) no se parten.
3. El punto medio no se lee como símbolo suelto: el lector de pantalla anuncia «verbo separable» (RNF-09).
4. No hay peticiones de red adicionales (RNF-01).

## Verificación
2026-10-19: pruebas unitarias (`lib/domain/separable.test.ts`, `word-panel.test.tsx`) y Playwright en Chromium 360/768/1280 y WebKit iPhone sobre la página de ejemplo (*ruft … an* → «an·rufen»). Criterios 1–4 cumplidos. Limitación: la partición es por lista de partículas (heurística); verbos raros que empiezan como uno separable sin serlo se corrigen añadiéndolos a `NOT_SEPARABLE` en `lib/domain/separable.ts`.
