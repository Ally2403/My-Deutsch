**Fase actual:** 2 · Spike técnico (rama `feat/RNF-03-spike-ocr`).
**Hecho:** la usuaria aprobó los requisitos de la Fase 1 (2026-10-17) y los nuevos RF-38 (doble página girada) y RF-39 (palabras cortadas con guion). Repositorio público (nota en ADR-002).
**Siguiente paso:** OCR de las 5 hojas de `samples/Der Schatz-3-7.pdf` (10 páginas lógicas) con Tesseract en Docker → medir RNF-03, RF-38 y RF-39 → conjunto de 300 palabras para RF-23.
**Bloqueos:** faltan el proyecto de Supabase y el cliente OAuth de Google (Fase 3).
