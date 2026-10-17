# RNF-09 — Accesibilidad y contraste de colores de género

| Campo | Valor |
|---|---|
| **ID** | RNF-09 |
| **Título** | Accesibilidad y contraste de colores de género |
| **Módulo** | M-T Transversal |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-22](../funcionales/RF-22-mostrar-genero-y-color-del-sustantivo.md), [RF-26](../funcionales/RF-26-colorear-todos-los-sustantivos.md) |
| **Reglas de negocio** | — |

## Descripción
Los colores de género (azul, verde, rojo) tienen un contraste ≥ 4.5:1 como texto sobre el fondo del panel en tema claro y oscuro, y el género nunca se comunica solo con color.

## Justificación
Algunos usuarios pueden tener daltonismo, y el panel debe leerse en cualquier tema.

## Criterios de aceptación
1. La verificación automática de contraste de los tokens der/das/die da ≥ 4.5:1 en ambos temas.
2. El panel siempre incluye el artículo escrito, y el resaltado de sustantivos tiene un patrón o forma distinta por género (borde inferior sólido, punteado o doble), visible en una simulación de deuteranopía.
3. La aplicación se puede navegar con teclado y lector de pantalla (axe-core sin violaciones serias).
