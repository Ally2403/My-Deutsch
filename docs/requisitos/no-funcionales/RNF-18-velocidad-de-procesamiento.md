# RNF-18 — Velocidad de procesamiento

| Campo                 | Valor                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **ID**                | RNF-18                                                                                                                   |
| **Título**            | Velocidad de procesamiento                                                                                               |
| **Módulo**            | M-4 Procesamiento (worker)                                                                                               |
| **Prioridad**         | Alta                                                                                                                     |
| **Fase**              | 6                                                                                                                        |
| **Estado**            | Pendiente                                                                                                                |
| **Dependencias**      | [RF-46](../funcionales/RF-46-progreso-de-procesamiento-fiel.md), [RNF-04](RNF-04-tiempo-de-procesamiento-de-un-libro.md) |
| **Reglas de negocio** | —                                                                                                                        |

## Descripción

El worker procesa el libro de muestra (167 páginas) en ≤ 7 min en el runner de Actions (línea base: 14 min 49 s), con salida idéntica a la del modo secuencial.

## Justificación

Hoy el procesamiento es secuencial (~3,5 s por página); el runner tiene 4 vCPU y el OCR corre en subprocesos que se pueden paralelizar.

## Criterios de aceptación

1. El OCR y la preparación de hojas se ejecutan en paralelo (etapa A) y el análisis, la traducción y la publicación en orden (etapa B).
2. JSON de páginas, `manifest.json` y `lexicon.json` son idénticos byte a byte con `workers=1` y `workers=3`.
3. Con 4 CPU el rendimiento es ≥ 2× páginas/min respecto al modo secuencial (banco `worker/tools/bench.py`).
4. Un fallo (p. ej. tiempo agotado de Tesseract) deja el libro en error, nunca en «procesando»; la reanudación no repite el OCR de páginas ya hechas.
5. Medición en el runner con la muestra: ≤ 7 min (si no se puede medir, queda sin verificar).

## Línea base

Por medir (Tarea 1.2). Última ejecución de referencia: 167 páginas en 14 min 49 s.

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-20. Plan: [`superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md`](../../superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md).

## Verificación

Pendiente.
