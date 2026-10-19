# RNF-09 — Accesibilidad y contraste de colores de género

| Campo | Valor |
|---|---|
| **ID** | RNF-09 |
| **Título** | Accesibilidad y contraste de colores de género |
| **Módulo** | M-T Transversal |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-22](../funcionales/RF-22-mostrar-genero-y-color-del-sustantivo.md), [RF-26](../funcionales/RF-26-colorear-todos-los-sustantivos.md) |
| **Reglas de negocio** | — |

## Descripción
Los colores de género (azul, verde, rojo) tienen un contraste ≥ 4.5:1 como texto sobre el fondo del panel en tema claro y oscuro, y el género nunca se comunica solo con color.

## Justificación
Algunos usuarios pueden tener daltonismo, y el panel debe leerse en cualquier tema.

## Criterios de aceptación
1. La verificación automática de contraste de los tokens der/das/die da ≥ 4.5:1 en ambos temas.
2. El panel siempre incluye el artículo escrito, y el resaltado de sustantivos es solo un fondo translúcido (sin líneas: la usuaria las quitó el 2026-10-19 porque tapaban la lectura en el celular); el género nunca depende solo del color porque el panel lo escribe.
3. La aplicación se puede navegar con teclado y lector de pantalla (axe-core sin violaciones serias).

## Verificación
Verificado el 2026-10-17 con las 3 páginas sintéticas de `public/demo/` (`/lector/demo`): Playwright en Chromium a 360, 768 y 1280 px contra la build de producción, y WebKit con perfil iPhone 13 emulado en Windows. No se ha probado con un libro real ni en un iPhone físico.

1. ✅ Los tokens der/das/die (y el gris de solo plural) dan ≥ 4,5:1 en tema claro y oscuro (prueba automática).
2. ⚠ Parcial: el artículo siempre se escribe y el resaltado ya no usa bordes; el género se lee en el panel.
3. ⚠ Parcial: axe-core sin violaciones serias en el lector y con el panel abierto; las palabras se activan con teclado (Enter/Espacio). Sin prueba con lector de pantalla real.

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
- Limitación conocida: sin prueba con lector de pantalla real ni simulación de deuteranopía (el género se escribe siempre en el panel).
