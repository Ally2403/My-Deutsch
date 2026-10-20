# RNF-18 — Velocidad de procesamiento

| Campo                 | Valor                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **ID**                | RNF-18                                                                                                                   |
| **Título**            | Velocidad de procesamiento                                                                                               |
| **Módulo**            | M-4 Procesamiento (worker)                                                                                               |
| **Prioridad**         | Alta                                                                                                                     |
| **Fase**              | 6                                                                                                                        |
| **Estado**            | En progreso                                                                                                              |
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

Última ejecución de referencia en Actions: 167 páginas en 14 min 49 s (~5,3 s por página, todo secuencial).

Medición local (Tarea 1.2, `worker/tools/bench.py`, imagen `mydeutsch-spike` con Tesseract `deu`, `--cpuset-cpus=0-3` (4 núcleos reales; con `--cpus=4`, que solo limita cuota sobre 8 núcleos, la medición salía 60 % más lenta), modo secuencial `--workers 1`). La muestra disponible (`Der Schatz-3-7.pdf`) tiene solo 5 hojas (10 páginas) y arranca en frío (el léxico del libro está vacío y el modelo Opus-MT sin calentar), por lo que sobrerrepresenta la traducción:

| Etapa             | Original secuencial (s) | Lotes, `--workers 1` (s) | Lotes, `--workers 3` (s, CPU sumada) |
| ----------------- | ----------------------: | -----------------------: | -----------------------------------: |
| `rot` (OSD)       |                    24,9 |                     23,0 |                                 17,9 |
| `ocr`             |                    31,2 |                     24,3 |                                 20,0 |
| `printed`         |                    15,1 |                     23,4 |                                 14,8 |
| `analyze` (spaCy) |                     3,2 |                      3,8 |                                  4,1 |
| `translate`       |                    85,8 |                     55,1 |                                 44,2 |
| `webp`            |                    16,7 |                     16,7 |                                 15,7 |
| **Reloj total**   |               **113,3** |                 **78,7** |                             **64,8** |
| Páginas/min       |                     5,3 |                      7,6 |                                  9,3 |

Salida: la huella SHA-256 de JSON de páginas, `manifest.json` y `lexicon.json` es **idéntica entre `--workers 1` y `--workers 3`** (`4e0ddc21…`). El paso a traducción por lote cambia algunas acepciones automáticas respecto al código anterior (huella `41c27e0a…`), porque CTranslate2 no da bit a bit lo mismo en lote que de una en una.

Resultado: **1,75× páginas/min respecto al original** en la muestra (1,2× solo por paralelizar sobre el modo por lotes). **El criterio 3 (≥ 2×) no se cumple en la muestra y no se pudo medir en un libro representativo**: con solo 10 páginas el arranque en frío (léxico vacío) hace que la traducción, que sigue siendo secuencial en la etapa B, pese ~70 % del reloj; en un libro largo el léxico se llena y la traducción por página baja. Pendiente: cronometrar un libro de ~167 páginas en Actions.

Conclusión inicial: la traducción (una llamada por acepción, de una en una) y el OSD de cada hoja pesan más que el OCR en sí; las etapas de Tesseract y `webp` son paralelizables y la traducción se acelera enviándola por lote.

Decisión autónoma: el manifiesto ya no guarda tiempos (solo `pages`, `sheets`, `mean_confidence`) para poder compararlo byte a byte; los tiempos van en el resumen y el registro.

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-20. Plan: [`superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md`](../../superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md).

## Verificación

- c1, c2 (verificado): pruebas `worker/tests/test_prepare.py` y huella del banco (`workers` 1 vs 3 idénticos).
- c4 (verificado): timeout en un hilo → `progress.json` en error, `run_job` deja `processing_failed`; reanudación sin repetir OCR.
- c3 (no cumplido en la muestra: 1,75×) y c5 (no se pudo medir en Actions): pendientes.
