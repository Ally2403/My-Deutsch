# Spike de la Fase 2 — resultados (2026-10-17)

Código: `worker/spike/` (rama `feat/RNF-03-spike-ocr`). Muestra: `samples/Der Schatz-3-7.pdf`, 5 hojas escaneadas, cada una **girada 90° y con dos páginas del libro** (págs. 4–13). Entorno: Docker `ubuntu:24.04` (igual al runner de Actions) con Tesseract 5 `deu`, spaCy 3.8 `de_core_news_md` y el volcado alemán de kaikki.org (2026-10-03).

## Resumen

| Requisito | Meta | Resultado | ¿Cumple? |
|---|---|---|---|
| RNF-03 · precisión por palabra (5 págs. de referencia) | ≥ 95 % | **98,5 %** (págs.: 94,0 · 99,2 · 98,8 · 99,6 · 98,9) | ✅ |
| RNF-03 · umlauts y ß | ≥ 98 % | **99,0 %** | ✅ |
| RF-38 · 5 hojas → 10 páginas derechas y en orden | 10 | **10**, números impresos 4–13 correctos | ✅ |
| RF-38 · orientación 0/90/180/270° | — | 4/4 detectadas con OSD de Tesseract | ✅ |
| RF-39 · palabras cortadas al final de línea unidas | ≥ 95 % | **29/30 = 96,7 %** | ✅ |
| RF-23 · 307 formas flexionadas → lema | ≥ 90 % | **97,4 %** (spaCy solo: 87,9 %) | ✅ |
| RNF-04 · 200 páginas < 60 min | < 60 min | ~2,5 s/página en local → estimado 8–17 min | ⏳ medir en Actions (Fase 3) |

## Hallazgos
1. **Tesseract basta sin preprocesamiento** (`--oem 1 --psm 3`, 300 DPI, escala de grises). No hace falta el plan B de ADR-005.
2. **La página 4 (índice) baja al 94 %** por las líneas de puntos ("Lernkrimi ........ 5"). No afecta la lectura; en la Fase 3 se pueden filtrar los tokens sin letras.
3. **Las pestañas laterales "ÜBUNG n" y los logotipos** generan casi todo el ruido ("=", "»", "ı8", "53"). Uno de esos tokens ("53") impidió unir "Substan-/tiv". En la Fase 3 se descartan los tokens del margen exterior.
4. **El número impreso** está en una barra con trama gris y Tesseract lo lee mal por separado. Funciona combinar las lecturas de varias escalas y umbrales y elegir el **desfase más votado** del libro (`infer_printed_numbers`).
5. **Lemas:** el lematizador de spaCy inventa lemas (murmelen, wussen, hätteben) y falla con los irregulares. Con el orden de ADR-003 (tabla de formas de Wiktionary → spaCy → reglas) se llega al 97,4 %. Además: (a) se excluyen las entradas `alt-of` (grafía antigua o suiza: Schloß, reissen); (b) respaldos para compuestos (Kunstschätze → Kunstschatz), participios usados como adjetivo (abgestimmter → abgestimmt) y zu-infinitivos (herumzustänkern).
6. **Errores restantes de lema (8):** gehört (hören, no gehören: depende del contexto), allem, rechten, einige/einigen (→ einig), Ganzen, halblange y geschäftigte (no están en Wiktionary). Para lemas ambiguos queda RF-25 (sugerencias).
7. El libro trae **palabras mal escritas a propósito** (Übung 1: Tränerin, schwepte, schäzte, fülte…). El OCR las conserva, como debe. El lector no debe "corregirlas" (relevante para RF-25).

## Conjunto de prueba
- Transcripciones de referencia: `worker/spike/data/gt/` (no se versionan: texto con derechos de autor). Se construyeron desde el OCR, verificando cada línea contra la imagen y ampliando las palabras dudosas.
- Lemas: `worker/spike/lemma_gold.tsv` (307 formas aisladas, etiquetadas a mano; sí se versiona).

## Cómo reproducir
```bash
docker build -t mydeutsch-spike worker/spike
cd worker/spike
./run.sh uv run python run_ocr.py "/repo/samples/Der Schatz-3-7.pdf"
./run.sh uv run python evaluate.py
curl -L -o data/lexicon/de.jsonl.gz https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl.gz
./run.sh uv run python evaluate_lemmas.py
./run.sh uv run pytest
```
