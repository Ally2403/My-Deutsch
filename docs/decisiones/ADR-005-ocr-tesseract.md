# ADR-005 · OCR con Tesseract 5 (modelo `deu`, LSTM)

**Estado:** Propuesta — se confirma con las métricas del spike (RNF-03) · **Requisitos:** RF-12, RF-17, RNF-03

## Decisión
Tesseract 5 con `-l deu --oem 1 --psm 3` sobre imágenes de 300 DPI con preprocesamiento (escala de grises, eliminación de ruido y enderezado con OpenCV), salida TSV/hOCR con cajas por palabra, línea y párrafo. Los libros son de una columna (dato de la usuaria), por lo que la segmentación automática basta.

## Plan B (si el spike da < 95 %)
1. Probar `deu_latf`/`tessdata_best` y binarización adaptativa.
2. Probar **docTR** o **PaddleOCR** (también open source y gratuitos; más lentos en CPU).
3. Corrección posterior con diccionario: si una palabra no existe en el léxico y hay una candidata a distancia 1 (p. ej. confusión ü/ii), se sugiere en RF-25.
