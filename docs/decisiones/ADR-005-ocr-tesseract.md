# ADR-005 · OCR con Tesseract 5 (modelo `deu`, LSTM)

**Estado:** Aceptada (spike del 2026-10-17: 98,5 % de palabras, 99,0 % de umlauts; ver `docs/spike-fase-2.md`) · **Requisitos:** RF-12, RF-17, RNF-03

## Decisión
Tesseract 5 con `-l deu --oem 1 --psm 3` sobre imágenes de 300 DPI con preprocesamiento (escala de grises, eliminación de ruido y enderezado con OpenCV), salida TSV/hOCR con cajas por palabra, línea y párrafo. Los libros son de una columna (dato de la usuaria), por lo que la segmentación automática basta.

## Plan B (si el spike da < 95 %)
1. Probar `deu_latf`/`tessdata_best` y binarización adaptativa.
2. Probar **docTR** o **PaddleOCR** (también open source y gratuitos; más lentos en CPU).
3. Corrección posterior con diccionario: si una palabra no existe en el léxico y hay una candidata a distancia 1 (p. ej. confusión ü/ii), se sugiere en RF-25.

## Ajustes tras el spike
- No hace falta preprocesar con OpenCV: escala de grises a 300 DPI basta.
- Antes del OCR: orientación con `--psm 0` (OSD) y separación de dobles páginas por la franja sin tinta del lomo (RF-38).
- El número impreso se obtiene votando el desfase entre varias lecturas del pie (escalas 2–3×, umbrales 90/110/130).
