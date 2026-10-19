# RNF-01 — Tiempo de respuesta al consultar una palabra

| Campo | Valor |
|---|---|
| **ID** | RNF-01 |
| **Título** | Tiempo de respuesta al consultar una palabra |
| **Módulo** | M-6 Léxico |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-21](../funcionales/RF-21-consultar-palabra.md) |
| **Reglas de negocio** | — |

## Descripción
Desde que el usuario toca una palabra hasta que el panel muestra sus significados transcurren menos de 300 ms en el percentil 95, en un celular de gama media con 4G.

## Justificación
Si la consulta es lenta, el usuario pierde el hilo de la lectura y la ventaja frente a un diccionario externo desaparece.

## Criterios de aceptación
1. Medición con Playwright (perfil Moto G4 + 4G rápido) sobre 100 toques en un libro real: p95 < 300 ms.
2. Las entradas de léxico de la página se descargan junto con la página, por lo que tocar una palabra no hace peticiones de red.

## Verificación
Verificado el 2026-10-17 con las 3 páginas sintéticas de `public/demo/` (`/lector/demo`): Playwright en Chromium a 360, 768 y 1280 px contra la build de producción, y WebKit con perfil iPhone 13 emulado en Windows. No se ha probado con un libro real ni en un iPhone físico.

1. ⚠ Parcial: p95 de 45–131 ms en 100 toques con CPU ×4 en Chromium (360 px: 83 ms; 768 px: 45 ms; 1280 px: 131 ms). Falta el perfil Moto G4 + 4G y un libro real.
2. ✅ Las entradas de léxico viajan en el JSON de la página; tocar una palabra no hace peticiones.

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
- Limitación conocida: sin el perfil Moto G4 + 4G; p95 medido 45–131 ms con CPU ×4.
