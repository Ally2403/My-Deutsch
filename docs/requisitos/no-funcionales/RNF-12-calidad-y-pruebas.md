# RNF-12 — Calidad y pruebas

| Campo | Valor |
|---|---|
| **ID** | RNF-12 |
| **Título** | Calidad y pruebas |
| **Módulo** | M-T Transversal |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | — |
| **Reglas de negocio** | — |

## Descripción
La lógica de dominio (resolución de colores, reglas de vocabulario, conversión de coordenadas, lematización y detección de separables) tiene pruebas automáticas con al menos 70 % de cobertura de líneas, y los flujos críticos tienen pruebas end-to-end.

## Justificación
Permite avanzar rápido con agentes sin romper lo que ya funciona.

## Criterios de aceptación
1. CI (GitHub Actions) ejecuta typecheck, lint, Vitest, pytest y Playwright en cada push; un fallo bloquea la fusión.
2. El informe de cobertura de los paquetes de dominio es ≥ 70 %.

## Verificación (2026-10-19)
- Criterio 2 ✅ cobertura de `lib/domain/**` con Vitest: 97,5 % de líneas (umbral 70 % en CI).
- Criterio 1 ◐ `.github/workflows/ci.yml` (typecheck, lint, Vitest + cobertura, Playwright, ruff y pytest del worker) añadido; las mismas órdenes pasan en local (463 pruebas, e2e, 255 pytest). Falta ver el primer run en GitHub y activar la protección de rama (requiere a la usuaria).

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
- CI (`.github/workflows/ci.yml`) corre typecheck, lint, Vitest con cobertura (97,5 % de líneas en `lib/domain`), Playwright, ruff y pytest; la usuaria protegió `main` con esos checks.
