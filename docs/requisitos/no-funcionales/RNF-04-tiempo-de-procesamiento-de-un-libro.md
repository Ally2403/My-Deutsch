# RNF-04 — Tiempo de procesamiento de un libro

| Campo | Valor |
|---|---|
| **ID** | RNF-04 |
| **Título** | Tiempo de procesamiento de un libro |
| **Módulo** | M-4 Procesamiento (worker) |
| **Prioridad** | Media |
| **Fase** | 2 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-12](../funcionales/RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | — |

## Descripción
Un libro de 200 páginas se procesa por completo en menos de 60 minutos con la infraestructura gratuita.

## Justificación
El curso necesita el libro el mismo día que se sube.

## Criterios de aceptación
1. Medido en GitHub Actions (runner estándar): 200 páginas en < 60 min, y la primera página está disponible en < 5 min.
