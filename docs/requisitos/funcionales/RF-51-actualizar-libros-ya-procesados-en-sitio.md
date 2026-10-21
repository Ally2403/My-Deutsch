# RF-51 — Actualizar libros ya procesados en sitio

| Campo                 | Valor                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                | RF-51                                                                                                                                                |
| **Título**            | Actualizar libros ya procesados en sitio                                                                                                             |
| **Módulo**            | M-4 Procesamiento                                                                                                                                    |
| **Prioridad**         | Alta                                                                                                                                                 |
| **Fase**              | 6                                                                                                                                                    |
| **Estado**            | En progreso                                                                                                                                          |
| **Dependencias**      | [RF-12](RF-12-procesar-libro-en-segundo-plano.md), [RF-47](RF-47-traducir-frases-seleccionadas.md), [RF-11](RF-11-subir-pdf-escaneado-a-un-grupo.md) |
| **Reglas de negocio** | RN-02                                                                                                                                                |

## Descripción

El PDF se borra al terminar el procesamiento, así que un libro procesado con una versión anterior del pipeline no puede reprocesarse. Este requisito lo actualiza **en sitio**, sin el PDF: un modo «upgrade» del worker (workflow manual de Actions) recorre los libros con `pipeline_version` menor a la vigente, lee el JSON de cada página desde Storage y le añade lo que el pipeline nuevo produce y se puede derivar del propio JSON: `sents` (segmentación de oraciones con spaCy y traducción por lote con Opus-MT, mismo código de RF-47). Se conservan `book_id`, el progreso de lectura y las anotaciones. Además, al subir un PDF que ya existía en la biblioteca, la interfaz avisa que se reutilizó.

## Justificación

Los libros ya subidos no tenían traducción de frases (RF-47) y pedir que se suban de nuevo es innecesario si el JSON de página ya trae los tokens, sus cajas, líneas y párrafos. No hace falta el PDF ni tocar imágenes ni filas de `pages`.

## Criterios de aceptación

1. `books.pipeline_version int not null default 1` (migración aditiva, sin tocar datos existentes); el worker escribe la versión vigente al terminar libros nuevos.
2. El modo «upgrade» (`python -m upgrade`, workflow `upgrade-books.yml` con `workflow_dispatch`) procesa solo libros `ready` con `pipeline_version` menor; por cada página descarga el JSON, añade `sents`, lo valida con `validate_page` y lo sobreescribe solo si es válido. No toca imágenes ni filas de `pages`.
3. Escribe `pipeline_version` del libro únicamente cuando todas sus páginas quedaron actualizadas; si una página falla, el libro queda como estaba (cada JSON es válido antes y después) y se continúa con los demás libros.
4. Es idempotente y reanudable: las páginas que ya tienen `sents` se omiten; repetir la ejecución no cambia nada. Admite `--dry-run` y `--book-id`.
5. El registro de Actions no imprime texto de los libros, títulos ni claves.
6. En la subida, cuando finalizar devuelve `reused: true`, se muestra «Este libro ya estaba en la biblioteca; se reutilizó.»

## Limitación conocida

No se detectan campos de ejercicio (RF-34) ni ilustraciones (RF-18) en el modo upgrade: requieren la página a la resolución del escaneo (300 DPI) y el OCR; la imagen WebP de 1 600 px no da calidad aceptable (falsos positivos con bordes y adornos). Los libros que necesiten esas dos cosas deben subirse de nuevo.

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-21 (diseño en sitio, sin el PDF; sustituye el borrador previo de «reprocesar», PR #59 cerrado).

## Verificación

2026-10-21 (rama `feat/RF-51-actualizar-libros-en-sitio`):

- Criterio 1: cumplido. Migración `20261021100000_version_del_pipeline.sql` aplicada en producción con `apply_migration` (aditiva); pgTAP `supabase/tests/pipeline_version.test.sql` 6/6 contra la base real en una transacción con rollback; `get_advisors` sin avisos nuevos. El worker escribe `PIPELINE_VERSION` (2) en `finish_book` (`worker/tests/test_upgrade_client.py`).
- Criterios 2 a 4: cumplidos con datos sintéticos (`test_upgrade_page.py`, `test_upgrade_job.py`): añade `sents` válidos sin tocar el resto del JSON, omite páginas que ya los tienen, una falla de descarga/subida/JSON corrupto deja el libro en versión 1 y sigue con los demás, segunda ejecución sin escrituras, reanudación, `--dry-run` y `--book-id`. Segmentación real de spaCy comprobada en Docker (`sentence_starts` con `de_core_news_md`).
- Criterio 5: cumplido en prueba (el registro no contiene texto, traducciones ni rutas).
- Criterio 6: cumplido en pruebas de componente (`components/upload-book.test.tsx`). **No se verificó en el navegador** (Playwright no conectó en esta sesión).
- **No se verificó:** la ejecución real del workflow `upgrade-books` sobre libros de producción (por indicación, no se tocaron libros reales) ni la calidad/tiempo de la traducción Opus-MT real en ese flujo.
- Observación: la segmentación usa las mismas palabras que el pipeline original (sin la puntuación exterior), por lo que spaCy a veces no corta oraciones dentro de un párrafo; los límites de párrafo sí cortan. Es el mismo comportamiento de los libros nuevos.
- Limitación: no detecta campos de ejercicio ni ilustraciones (ver arriba).
