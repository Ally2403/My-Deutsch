# RNF-03 — Precisión del OCR

| Campo | Valor |
|---|---|
| **ID** | RNF-03 |
| **Título** | Precisión del OCR |
| **Módulo** | M-4 Procesamiento (worker) |
| **Prioridad** | Alta |
| **Fase** | 2 |
| **Estado** | En progreso |
| **Dependencias** | [RF-12](../funcionales/RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | — |

## Descripción
El OCR reconoce correctamente al menos el 95 % de las palabras en las páginas de texto de los libros del curso, incluidos umlauts (ä, ö, ü) y ß.

## Justificación
Cada error de OCR produce una consulta de palabra fallida o incorrecta.

## Criterios de aceptación
1. Sobre 5 páginas de referencia transcritas a mano (definidas en la Fase 2), la precisión a nivel de palabra es ≥ 95 %.
2. Los umlauts y la ß se reconocen correctamente en ≥ 98 % de sus apariciones en esas páginas.

## Verificación
Spike (2026-10-17, `docs/spike-fase-2.md`): 98,5 % de palabras y 99,0 % de umlauts/ß en 5 páginas de referencia. ✅ Criterios 1 y 2 verificados en el spike; falta confirmarlos en el worker de la Fase 3.

Worker de la Fase 3 (2026-10-17, entrega 1): sobre las mismas 5 páginas de referencia, **95,6 %** de palabras y **98,5 %** de umlauts/ß. ✅ Criterios 1 y 2 verificados en el worker (el filtro de ruido se ajustó: antes quitaba palabras cortas válidas, 92,4 %).
