# CU-05 — Procesar un libro (interno)

**Requisitos:** RF-12, RF-23, RF-24, RF-34

## 1. Descripción corta

El worker convierte el PDF en páginas interactivas. Lo inicia el sistema, no un actor humano.

## 2. Actores

- Sistema (invocado por CU-04)

## 3. Precondiciones

- Existe un trabajo en estado "En cola" con su PDF en Storage.

## 4. Flujo básico de eventos

1. El worker toma el trabajo y lo marca como "Procesando".
2. Por cada página pendiente: renderiza la imagen a 300 DPI para el OCR y la guarda en WebP de 1 600 px.
3. Ejecuta Tesseract (deu) y obtiene palabras con cajas, líneas y párrafos.
4. Analiza las oraciones con spaCy: lema, tipo de palabra y verbos separables.
5. Enlaza cada token al léxico (forma → lema → entrada), inserta en `lexicon` las entradas nuevas y traduce al español la palabra y sus definiciones limpias cuando Wiktionary no trae traducción (Opus-MT, ADR-007).
6. Detecta zonas de imagen y campos de ejercicio.
7. Publica el JSON de tokens y actualiza `pages` y `jobs.pages_done`.
8. Al terminar todas las páginas, marca el libro como "Listo" y borra el PDF original.

## 5. Flujos alternos

- **2a. Página sin texto (ilustración completa):** se publica solo la imagen, con la lista de tokens vacía.

## 6. Postcondiciones

### 6.1 Completado satisfactoriamente

El libro queda en estado "Listo", con todas sus páginas publicadas.

### 6.2 Terminado con condición de falla

El trabajo queda en "Error" con el motivo y las páginas ya publicadas siguen disponibles; reintentar continúa desde la primera página pendiente.

## 7. Excepciones

- PDF dañado o protegido con contraseña: "Error: no se pudo abrir el PDF".
- Se agota el tiempo del runner: el trabajo se vuelve a encolar automáticamente una vez y continúa.
