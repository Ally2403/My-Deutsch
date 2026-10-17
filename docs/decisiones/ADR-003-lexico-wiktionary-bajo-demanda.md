# ADR-003 · Léxico de Wiktionary (kaikki.org) cargado bajo demanda

**Estado:** Aceptada · **Requisitos:** RF-21–RF-25, RNF-01

## Contexto
Se necesitan lema, tipo de palabra, género, plural y significados en español para vocabulario hasta C1, gratis y sin APIs. El volcado alemán completo de Wiktionary pesa más de 1 GB y sus formas flexionadas suman millones de filas, lo que no cabe en los 500 MB de Supabase.

## Decisión
1. `build-lexicon.yml` descarga el volcado JSONL alemán de kaikki.org (Wiktionary en inglés), conserva por entrada: lema, tipo, géneros, plural, hasta 5 acepciones (glosa en inglés), traducciones al español si existen y la tabla de formas → lema. Lo guarda en SQLite comprimido como caché o artefacto (~150–300 MB).
2. El worker resuelve cada token así: (a) forma exacta en la tabla de formas, (b) lema de spaCy con el tipo de palabra, (c) búsqueda sin distinguir mayúsculas. Si el tipo es ambiguo, usa el que propone spaCy en contexto.
3. Significado en español: primero la traducción española de Wiktionary; si no existe, traduce la glosa inglesa con Argos Translate en→es (offline) y la marca `machine: true`.
4. Solo las entradas **usadas en algún libro** se insertan en `lexicon` (Postgres) y se incluyen en el JSON de cada página. Un libro de 200 páginas usa unos 5 000–10 000 lemas.

## Alternativas
- es.wiktionary directo: menos cobertura y formato menos estructurado; puede sumarse luego como fuente prioritaria de acepciones en español.
- LLM (Claude): mejor calidad contextual, pero tiene costo; queda como mejora futura opcional para palabras ambiguas.

## Consecuencias
Consulta instantánea y offline, base de datos pequeña y cobertura amplia. La calidad de los significados traducidos automáticamente es variable, por eso se marcan como tales.

## Nota del spike (2026-10-17)
El orden del punto 2 llega al 97,4 % en RF-23 (spaCy solo: 87,9 %). Se añaden: excluir las entradas `alt-of` (grafía antigua o suiza) al construir la tabla de formas, y respaldos para compuestos (cabeza conocida), participios usados como adjetivo y zu-infinitivos. El volcado comprimido pesa 98 MB y el índice de formas tiene ~480 000 formas y ~90 000 lemas (se construye en ~26 s).
