# RNF-07 — Usabilidad en móvil

| Campo | Valor |
|---|---|
| **ID** | RNF-07 |
| **Título** | Usabilidad en móvil |
| **Módulo** | M-T Transversal |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-36](../funcionales/RF-36-interfaz-responsive-en-celular-tablet-y-computador.md) |
| **Reglas de negocio** | — |

## Descripción
Todas las pantallas funcionan desde 360 px de ancho sin desplazamiento horizontal, con objetivos táctiles de al menos 44×44 px y texto base de al menos 16 px.

## Justificación
El uso principal será en celular.

## Criterios de aceptación
1. Las pruebas de Playwright en 360×740, 768×1024 y 1280×800 no detectan desplazamiento horizontal (scrollWidth ≤ clientWidth) en ninguna pantalla.
2. La auditoría automática de objetivos táctiles no reporta elementos interactivos menores de 44 px (excepto las palabras de la capa de texto, cuya área de toque se amplía a 44 px de alto).
