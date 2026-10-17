# ADR-002 · Worker de procesamiento en GitHub Actions

**Estado:** Aceptada (se valida en el spike de la Fase 2) · **Requisitos:** RF-12, RNF-04

## Contexto
El OCR (Tesseract) y el análisis lingüístico (spaCy, Argos) necesitan Python, varios GB de RAM y minutos de CPU por libro. Las funciones serverless de Vercel no sirven (límite de tiempo y tamaño), y los hostings gratuitos de contenedores se duermen o tienen 512 MB de RAM.

## Decisión
Un workflow `process-book.yml` que la API dispara con `repository_dispatch` y el `book_id`. El runner (Ubuntu, 4 vCPU y 16 GB en repositorios públicos; 2 vCPU y 7 GB en privados) instala Tesseract `deu`, restaura de la caché el léxico y los modelos, procesa las páginas en paralelo (multiprocessing) y escribe en Supabase con el service role guardado como secreto de GitHub. Un trabajo nunca dura más de 5 h; si se corta, vuelve a encolarse y continúa (reanudable por página).

## Alternativas
- **Hugging Face Spaces (CPU gratis)**: opción de respaldo si Actions falla, aunque se duerme y requiere colas propias.
- **PC de la usuaria con un script local**: respaldo manual para casos excepcionales.
- **OCR en la nube (Google Vision)**: descartado por la restricción de costo cero.

## Consecuencias
Costo cero y potencia suficiente. Arranque de 1–2 minutos por trabajo (aceptable). En un repositorio privado hay 2 000 min/mes (≈ 80–100 libros); si el repositorio es público, los minutos son ilimitados, pero el código queda visible (los PDF nunca se suben al repositorio).
