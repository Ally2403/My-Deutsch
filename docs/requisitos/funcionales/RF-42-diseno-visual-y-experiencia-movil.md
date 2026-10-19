# RF-42 — Diseño visual y experiencia móvil

| Campo | Valor |
|---|---|
| **ID** | RF-42 |
| **Título** | Diseño visual y experiencia móvil |
| **Módulo** | M-1 Aplicación |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | En progreso |
| **Dependencias** | [RF-14](RF-14-ver-biblioteca-del-grupo.md), [RF-17](RF-17-texto-seleccionable-alineado-al-original.md) |
| **Reglas de negocio** | — |

## Descripción
La aplicación tiene una identidad visual coherente (colores, tipografía, espaciado, iconos) y una experiencia interactiva y agradable, pensada primero para iPhone a 360 px. Se rediseña en este orden: inicio, ingreso y registro, grupos, biblioteca con portadas, subida de libros y lector. Inicialmente solo en modo claro; el modo oscuro es una mejora posterior.

## Justificación
Hoy las pantallas son funcionales pero sin trabajo de diseño; el curso (~25 estudiantes, sobre todo en celular) necesita que usarla dé gusto y sea clara.

## Criterios de aceptación
1. Hay tokens de diseño centralizados (colores, tipografía, radios, sombras, espaciado) y todas las pantallas los usan.
2. Los colores de género (der azul, das verde, die rojo) se mantienen y cumplen contraste ≥ 4,5:1; el género nunca se indica solo con color (RNF-09).
3. Las interacciones dan respuesta visible (estado de pulsado, carga, éxito y error) y respetan `prefers-reduced-motion`.
4. Objetivos táctiles ≥ 44 px, sin dependencia de hover, sin desbordamiento horizontal a 360, 768 y 1280 px, y `env(safe-area-inset-*)`.
5. Modo claro completo. El modo oscuro queda fuera de este requisito (se propondrá aparte).

## Verificación (2026-10-19, primera entrega)
- Criterio 1 ✅ tokens en `app/globals.css` (colores, radios, sombras, fuentes Bricolage Grotesque + Figtree) y primitivas en `components/ui.tsx`; inicio, ingreso, registro, recuperar, grupos, tarjetas de libro y barra/panel del lector los usan. Pendiente: pantallas internas de grupo y subida (clases sueltas).
- Criterio 2 ✅ colores de género intactos; axe-core del lector sin violaciones serias (e2e); el género sigue con borde distinto.
- Criterio 3 ◐ estado de pulsado (`.pressable`), `Button loading`, `prefers-reduced-motion` respetado. Falta revisar los estados de éxito/error de cada formulario.
- Criterio 4 ✅ en rutas públicas: sin desbordamiento a 360/768/1280 y objetivos ≥ 44 px (auditado en una build); `env(safe-area-inset-*)` en `body`. Rutas con sesión sin auditar.
- Criterio 5 ✅ claro primero (el oscuro conserva tokens básicos, sin pulir).
- Suite 377/377, e2e 62 pasadas (Chromium 360/768/1280 y WebKit iPhone). Sin ver: grupos, biblioteca y subida con sesión real.
