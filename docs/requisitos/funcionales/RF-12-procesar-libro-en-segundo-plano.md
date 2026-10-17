# RF-12 — Procesar libro en segundo plano

| Campo | Valor |
|---|---|
| **ID** | RF-12 |
| **Título** | Procesar libro en segundo plano |
| **Módulo** | M-4 Procesamiento (worker) |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-11](RF-11-subir-pdf-escaneado-a-un-grupo.md) |
| **Reglas de negocio** | RN-01, RN-06, RN-07, RN-10 |

## Descripción
El worker convierte cada página en imagen, ejecuta OCR en alemán para obtener cada palabra con su posición, la analiza (lema, tipo de palabra, género, verbo separable), la vincula al léxico y publica la página. El proceso es reanudable por página.

## Justificación
Hacer este trabajo una sola vez es lo que permite que la consulta de palabras sea instantánea para todos.

## Criterios de aceptación
1. Por cada página se generan una imagen WebP y un archivo de tokens con coordenadas relativas, texto, lema, tipo, género e id de léxico.
2. Si el procesamiento falla en la página N, al reintentar continúa desde N, sin repetir las anteriores.
3. Al terminar, el estado del libro pasa a "Listo" y se registran el número de páginas y la confianza media del OCR.
4. Cumple RNF-03 (precisión) y RNF-04 (tiempo).
