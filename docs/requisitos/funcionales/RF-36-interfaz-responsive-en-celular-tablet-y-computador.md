# RF-36 — Interfaz responsive en celular, tablet y computador

| Campo | Valor |
|---|---|
| **ID** | RF-36 |
| **Título** | Interfaz responsive en celular, tablet y computador |
| **Módulo** | M-T Transversal |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | — |
| **Reglas de negocio** | — |

## Descripción
Todas las pantallas se adaptan a celular (≥ 360 px), tablet (vertical y horizontal) y computador, con controles táctiles en móvil y atajos de teclado en computador.

## Justificación
Es el requisito transversal pedido: se usará sobre todo en esos tres tipos de dispositivo.

## Criterios de aceptación
1. Ver RNF-07 y RNF-15 para los criterios medibles.

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
- Cubierto por RNF-07 (Hecho) y RNF-15 (Hecho).
