# RF-19 — Zoom y ajuste de página

| Campo | Valor |
|---|---|
| **ID** | RF-19 |
| **Título** | Zoom y ajuste de página |
| **Módulo** | M-5 Lector |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | En progreso |
| **Dependencias** | [RF-16](RF-16-pasar-paginas.md) |
| **Reglas de negocio** | — |

## Descripción
El lector permite ajustar la página al ancho o al alto de la pantalla y hacer zoom con pellizco, doble toque o rueda con Ctrl.

## Justificación
En móvil hace falta ampliar para leer las letras pequeñas de los ejercicios.

## Criterios de aceptación
1. El pellizco amplía hasta 4×, y mientras hay zoom el desplazamiento no cambia de página.
2. El doble toque alterna entre ajustar al ancho y 2×.

## Verificación (2026-10-19)
- Lógica en `lib/domain/zoom.ts` (pruebas unitarias) y controles en el lector: «Ajustar al ancho»,
  «Ajustar al alto», − / + y porcentaje; el ancho de la página se calcula en px, así que la capa de
  texto (unidades `cqw`) escala con ella y las palabras siguen alineadas.
- Criterio 1 ✅ e2e (Chromium 360/768/1280 y WebKit iPhone, eventos de puntero sintéticos): el
  pellizco llega a 4× y con zoom un deslizamiento horizontal no cambia de página; las zonas laterales
  de cambio de página se desactivan con zoom.
- Criterio 2 ✅ e2e: el doble clic/toque en una zona sin palabra alterna 100 % ↔ 200 %. También
  Ctrl + rueda (sin zoom del navegador) y los botones (hasta 400 %).
- Sin verificar: pellizco con dedos reales en un iPhone (iOS puede aplicar su propio zoom de página
  si ignora `touch-action`), vista de dos páginas.
