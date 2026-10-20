# RF-49 — Indicador de avance de lectura

| Campo                 | Valor                           |
| --------------------- | ------------------------------- |
| **ID**                | RF-49                           |
| **Título**            | Indicador de avance de lectura  |
| **Módulo**            | M-5 Lector                      |
| **Prioridad**         | Media                           |
| **Fase**              | 6                               |
| **Estado**            | Pendiente                       |
| **Dependencias**      | [RF-16](RF-16-pasar-paginas.md) |
| **Reglas de negocio** | RN-14                           |

## Descripción

Barra y texto «Pág. X de Y · Z % leído» en el lector y en la página y tarjeta del libro, con dos capas: páginas leídas y posición actual.

## Justificación

Saber cuánto se lleva leído de cada libro.

## Criterios de aceptación

1. `positionPercent` y `progressLabel` (dominio puro y probado) manejan duplicados, páginas fuera de rango y total 1.
2. `role="progressbar"` con `aria-valuenow` y `aria-valuetext`.
3. Se actualiza al pasar de página en el lector; el mismo texto aparece en la página y tarjeta del libro.
4. Sin desborde horizontal a 360/768/1280 y WebKit iPhone; contraste ≥ 4,5:1 en claro y oscuro.

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-20. Plan: [`superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md`](../../superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md).

## Verificación

Pendiente.
