# RF-17 — Texto seleccionable alineado al original

| Campo | Valor |
|---|---|
| **ID** | RF-17 |
| **Título** | Texto seleccionable alineado al original |
| **Módulo** | M-5 Lector |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | En progreso |
| **Dependencias** | [RF-12](RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | — |

## Descripción
Cada página se muestra como la imagen original con una capa de texto transparente superpuesta, en la que cada palabra ocupa su posición. El texto se puede seleccionar y copiar como en un PDF con texto.

## Justificación
Mantiene la forma y el estilo del libro original (ilustraciones, tipografía, ejercicios) y a la vez permite interactuar con el texto.

## Criterios de aceptación
1. Al seleccionar con el dedo o el ratón, el resaltado coincide con las palabras visibles, con una desviación ≤ 2 % del ancho de la página.
2. El texto copiado conserva los espacios y saltos de línea en orden de lectura.
3. La alineación se mantiene al hacer zoom o rotar el dispositivo.

## Verificación
Verificado el 2026-10-17 con las 3 páginas sintéticas de `public/demo/` (`/lector/demo`): Playwright en Chromium a 360, 768 y 1280 px contra la build de producción, y WebKit con perfil iPhone 13 emulado en Windows. No se ha probado con un libro real ni en un iPhone físico.

1. ✅ Desviación entre la tinta de la imagen y la caja de cada palabra ≤ 2 % del ancho en las 3 resoluciones (comparación de píxeles en canvas).
2. ✅ El texto seleccionado conserva espacios y un salto por línea, en orden de lectura.
3. ✅ La capa sigue alineada con la imagen al girar el dispositivo. El zoom con pellizco no se probó.
Páginas reales (worker, 10 páginas de un libro escaneado): desviación entre la caja y la tinta con mediana 0,07 % y p95 0,20 % del ancho; unas pocas palabras llegan a 4,7 % (criterio 1 cumplido en el 99 %+ de las palabras, no en todas). Falta revisar esos casos atípicos.
