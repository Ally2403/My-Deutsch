# Worker de procesamiento (RF-12)

Convierte un PDF escaneado en páginas listas para el lector: imagen WebP + JSON de tokens (formato v1, `docs/04-modelo-de-datos.md`).

- `pipeline/` PDF → páginas lógicas → OCR → tokens → análisis → JSON/WebP.
- `lexicon/` construye y consulta el léxico (SQLite) desde el volcado de kaikki.org.
- `spike/` experimento de la Fase 2, congelado (`docs/spike-fase-2.md`).

Se ejecuta dentro de Docker (misma base que el runner de GitHub Actions): `./worker/run.sh uv run pytest`.
Los libros procesados y el léxico van en `worker/.local/` y **nunca** se versionan (el repositorio es público).
