# RNF-07 — Usabilidad en móvil

| Campo | Valor |
|---|---|
| **ID** | RNF-07 |
| **Título** | Usabilidad en móvil |
| **Módulo** | M-T Transversal |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-36](../funcionales/RF-36-interfaz-responsive-en-celular-tablet-y-computador.md) |
| **Reglas de negocio** | — |

## Descripción
Todas las pantallas funcionan desde 360 px de ancho sin desplazamiento horizontal, con objetivos táctiles de al menos 44×44 px y texto base de al menos 16 px.

## Justificación
El uso principal será en celular.

## Criterios de aceptación
1. Las pruebas de Playwright en 360×740, 768×1024 y 1280×800 no detectan desplazamiento horizontal (scrollWidth ≤ clientWidth) en ninguna pantalla.
2. La auditoría automática de objetivos táctiles no reporta elementos interactivos menores de 44 px (excepto las palabras de la capa de texto, cuya área de toque se amplía a 44 px de alto).

## Verificación (2026-10-19)
- Criterio 1 ✅ `e2e/tema.spec.ts` (6 rutas × tema claro/oscuro × 360/768/1280 y WebKit iPhone) y auditoría previa de 9 pantallas: 0 desbordes.
- Criterio 2 ✅ `e2e/tema.spec.ts` (controles de las rutas públicas ≥ 44 px; detectó y corrigió el logo de la barra, de 28 px) y auditoría previa de las pantallas con sesión.
