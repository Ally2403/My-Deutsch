# RNF-12 — Calidad y pruebas

| Campo | Valor |
|---|---|
| **ID** | RNF-12 |
| **Título** | Calidad y pruebas |
| **Módulo** | M-T Transversal |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | — |
| **Reglas de negocio** | — |

## Descripción
La lógica de dominio (resolución de colores, reglas de vocabulario, conversión de coordenadas, lematización y detección de separables) tiene pruebas automáticas con al menos 70 % de cobertura de líneas, y los flujos críticos tienen pruebas end-to-end.

## Justificación
Permite avanzar rápido con agentes sin romper lo que ya funciona.

## Criterios de aceptación
1. CI (GitHub Actions) ejecuta typecheck, lint, Vitest, pytest y Playwright en cada push; un fallo bloquea la fusión.
2. El informe de cobertura de los paquetes de dominio es ≥ 70 %.
