# RF-12 — Procesar libro en segundo plano

| Campo | Valor |
|---|---|
| **ID** | RF-12 |
| **Título** | Procesar libro en segundo plano |
| **Módulo** | M-4 Procesamiento (worker) |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | En progreso |
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

## Verificación
Entrega 1 (2026-10-17): worker ejecutado en local (Docker, imagen del spike) sobre `samples/Der Schatz-3-7.pdf` (5 hojas, 10 páginas lógicas), sin traducción automática. Los libros procesados no se versionan.

1. ✅ Por cada página se genera una imagen WebP (1 600 px, máx. 249 KB) y un JSON v1 con cajas relativas, texto, lema, tipo, género, forma, verbos separables e id de léxico. Los 10 JSON pasan `parsePage` (prueba de paridad en `lib/domain/local-book.test.ts`).
2. ✅ Reanudable por página: si falla la página N, al reintentar continúa en N sin repetir las anteriores (prueba automática).
3. ⚠ Parcial: la confianza media del OCR (94,5 %) y el número de páginas quedan en `manifest.json`; falta cambiar el estado del libro a «Listo» en la base de datos y publicar en Storage (entrega 2).
4. ⚠ Parcial: RNF-03 verificado en las 5 páginas de referencia (ver RNF-03); RNF-04 no medido en GitHub Actions (≈ 5 s por página en Docker local).

Medidas (10 páginas): 94,6 % de las palabras con letras obtienen entrada de léxico; entre las mayúsculas a mitad de oración, el resto son sobre todo nombres propios (correcto, RN-01) y 12 % no está en Wiktionary (nombres, compuestos o errores del OCR). Alineación caja/tinta: mediana 0,07 %, p95 0,20 %, máximo 4,7 % del ancho. Números impresos 4–13 inferidos correctamente.

Pendiente: traducción automática con Argos (aprovisionar el modelo y fijar su SHA-256), publicación en Supabase y Actions (entrega 2).

Entrega 2b (2026-10-18): `worker/publish/` + `.github/workflows/process-book.yml`. Probado con un cliente de Supabase simulado (`httpx.MockTransport`) y un PDF sintético; **no se ha ejecutado todavía en GitHub Actions ni contra la base real**.

1. ✅ (simulado) Cada página se publica en `pages/<book_id>/<n>.webp|json` con ids de léxico de Postgres (`tests/test_publish_job.py`).
2. ⚠ Parcial: el avance se publica por página (`jobs.pages_done`), pero un reintento reprocesa desde la primera hoja (el runner de Actions es nuevo en cada ejecución); las páginas se vuelven a subir sin duplicarse.
3. ✅ (simulado) Al terminar: libro y trabajo en «ready», `page_count` y confianza media; el PDF subido se borra. Si falla, el libro queda en «error» con un código (`hash_mismatch`, `invalid_pdf`, `too_many_pages`, `empty_book`, `processing_failed`, `publish_failed`).
4. ⚠ RNF-04 sin medir en Actions. RN-02 (huella recalculada) y RN-10 (≤ 400 páginas del PDF) probados en simulación.
