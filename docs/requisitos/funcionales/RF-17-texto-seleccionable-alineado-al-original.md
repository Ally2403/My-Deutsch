# RF-17 — Texto seleccionable alineado al original

| Campo | Valor |
|---|---|
| **ID** | RF-17 |
| **Título** | Texto seleccionable alineado al original |
| **Módulo** | M-5 Lector |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
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
