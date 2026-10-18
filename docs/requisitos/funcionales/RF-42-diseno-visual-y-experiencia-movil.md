# RF-42 — Diseño visual y experiencia móvil

| Campo | Valor |
|---|---|
| **ID** | RF-42 |
| **Título** | Diseño visual y experiencia móvil |
| **Módulo** | M-1 Aplicación |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-14](RF-14-ver-biblioteca-del-grupo.md), [RF-17](RF-17-abrir-el-lector-de-paginas.md) |
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

## Verificación
Sin verificar.
