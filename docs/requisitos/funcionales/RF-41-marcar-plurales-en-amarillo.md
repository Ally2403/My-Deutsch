# RF-41 — Marcar plurales en amarillo

| Campo | Valor |
|---|---|
| **ID** | RF-41 |
| **Título** | Marcar plurales en amarillo |
| **Módulo** | M-5 Lector |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-26](RF-26-colorear-todos-los-sustantivos.md) |
| **Reglas de negocio** | RN-01 |

## Descripción
Un interruptor del lector, independiente del de colorear sustantivos, marca en amarillo todos los sustantivos que aparecen en plural en la página: los que cambian de forma (*Häuser*), los que son iguales al singular (*die Lehrer*) y los de solo plural (*die Leute*). El panel de la palabra muestra una etiqueta «plural». La preferencia se recuerda.

## Justificación
La usuaria pidió distinguir a simple vista los plurales mientras lee, además del género. Reconocer el plural del sustantivo es parte de memorizarlo.

## Criterios de aceptación
1. Al activarlo, todos los sustantivos en plural de la página se marcan en < 100 ms, incluidos los de solo plural y los que tienen la misma forma en singular.
2. El marcado no depende solo del color (RNF-09): lleva un borde superior sólido y el panel muestra la etiqueta escrita «plural».
3. Se puede combinar con «Colorear sustantivos»: el género sigue distinguiéndose por el borde inferior y el artículo escrito.
4. El resaltado no impide leer el texto original (opacidad ≤ 35 %).
5. La preferencia persiste entre páginas, libros y sesiones.
