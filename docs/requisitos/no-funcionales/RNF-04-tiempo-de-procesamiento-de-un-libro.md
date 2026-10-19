# RNF-04 — Tiempo de procesamiento de un libro

| Campo | Valor |
|---|---|
| **ID** | RNF-04 |
| **Título** | Tiempo de procesamiento de un libro |
| **Módulo** | M-4 Procesamiento (worker) |
| **Prioridad** | Media |
| **Fase** | 2 |
| **Estado** | Hecho |
| **Dependencias** | [RF-12](../funcionales/RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | — |

## Descripción
Un libro de 200 páginas se procesa por completo en menos de 60 minutos con la infraestructura gratuita.

## Justificación
El curso necesita el libro el mismo día que se sube.

## Criterios de aceptación
1. Medido en GitHub Actions (runner estándar): 200 páginas en < 60 min, y la primera página está disponible en < 5 min.

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
- Medido en GitHub Actions: libro real de 142 páginas procesado en 16 min 40 s desde que arrancó (≈ 7 s por página; 200 páginas ≈ 24 min < 60 min) y 40 s desde el encolado hasta arrancar. La primera página se publica antes de terminar (avance por página en `jobs.pages_done`), sin cronometrar aparte.
