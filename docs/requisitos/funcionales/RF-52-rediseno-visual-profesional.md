# RF-52 — Rediseño visual profesional

| Campo                 | Valor                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------ |
| **ID**                | RF-52                                                                                      |
| **Título**            | Rediseño visual profesional                                                                |
| **Módulo**            | M-1 Cuenta                                                                                 |
| **Prioridad**         | Alta                                                                                       |
| **Fase**              | 6                                                                                          |
| **Estado**            | En progreso                                                                                |
| **Dependencias**      | [RF-42](RF-42-diseno-visual-y-experiencia-movil.md), [RF-44](RF-44-tema-claro-y-oscuro.md) |
| **Reglas de negocio** | —                                                                                          |

## Descripción

Sistema visual propio, sin el aspecto genérico de plantilla: fondo neutro gris-papel y tinta casi negra; el único color de la interfaz son los tres géneros (der azul, das verde, die roja), así que el color siempre significa algo. Botones primarios en tinta, bordes finos y casi sin sombras, radios distintos para controles y tarjetas, tipografía serif de libro de texto (Source Serif 4) para títulos y sans nítida (Geist) para la interfaz. Portada con una página de libro interactiva, barra superior con marca y estado activo de la navegación, y botones con tamaños y ubicación consistentes (≥ 44 px).

## Justificación

Pedido explícito de la usuaria (2026-10-21): la página debe verse muy profesional y dejar de parecer genérica, con botones bien ubicados y colores y tamaños correctos.

## Criterios de aceptación

1. Tokens CSS centralizados (`--background`, `--surface`, `--foreground`, `--accent`, `--mark`, géneros) en tema claro y oscuro; los colores de género siguen cumpliendo ≥ 4,5:1 (RNF-09).
2. Botones y chips ≥ 44 px, con estados de foco, pulsado y deshabilitado visibles; el foco usa un contorno de alto contraste.
3. La portada muestra una página de ejemplo con sustantivos tocables; el género se indica por color, tipo de subrayado y artículo escrito (RNF-09).
4. La barra superior marca la sección activa (`aria-current="page"`).
5. Sin desborde horizontal, y legible en 360, 768 y 1280 px, en ambos temas.
6. Sin regresiones: `pnpm test`, `pnpm typecheck` y las pruebas e2e existentes pasan.

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-21.

## Verificación

2026-10-21 (rama `dev`): pendiente de completar al cerrar el rediseño; ver `docs/ESTADO.md`.
