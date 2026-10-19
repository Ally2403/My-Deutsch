# ADR-007 · Traducción al español con Opus-MT (reemplaza el punto 3 de ADR-003)

**Estado:** Aceptada (2026-10-18) · **Reemplaza:** el punto 3 de [ADR-003](ADR-003-lexico-wiktionary-bajo-demanda.md) (Argos Translate) · **Requisitos:** RF-43, RF-21

## Contexto
El volcado de Wiktionary usado no trae traducciones al español: con Argos, el 100 % de las acepciones eran traducción automática de una definición inglesa suelta. La usuaria probó un libro real y varias salían literales o rebuscadas (*die Hilfe* → «el acto de ayudar, asistencia»). Una prueba comparativa sobre 40 palabras (2026-10-18) mostró:

| Palabra | Argos (hoy) | Opus-MT de→es con sonda |
|---|---|---|
| die Hilfe | el acto de ayudar, asistencia | la ayuda |
| der Schatz | tesoro, cariño | el tesoro |
| die Angst | miedo; miedo; ansiedad | el miedo |
| der Eindruck | impresión | la impresión |
| anfangen | comenzar; para empezar | empezar / comenzar |
| aufstehen | para levantarse… | levantarse |

Argos no produce «ayuda» para *Hilfe* ni siquiera traduciendo la palabra alemana directa, y traducir un verbo suelto da gerundios o sustantivos («Empezando», «Comprensión»).

## Decisión
1. Modelos Opus-MT de→es y en→es (Helsinki-NLP; licencia Apache-2.0 declarada en su repositorio de Hugging Face), convertidos una vez a CTranslate2 int8. Sin red al consultar una palabra (RNF-01).
2. **Acepción principal:** la palabra alemana se traduce con una «sonda» que da contexto gramatical: sustantivo con su artículo (*die Hilfe*), verbo en «Ich möchte …». La salida se normaliza (se quitan artículo y «Quiero») y se valida; si no tiene la forma esperada (verbo que no es infinitivo, igual a la palabra alemana) se descarta.
3. **Acepciones secundarias:** definiciones inglesas de Wiktionary limpias (sin «the act of…», sin paréntesis, separadas por coma y punto y coma), traducidas en→es (verbos con «I want to …»). Todas llevan `m: true`.
4. **Instalación verificada:** la revisión del repositorio de modelos y el SHA-256 de cada archivo se fijan en el código; si no coinciden, no se instala nada (igual que con Argos). El modelo convertido va en la caché de Actions.

## Alternativas
- Argos con mejor limpieza de definiciones: no resuelve casos como *Hilfe → ayuda*.
- LLM (Claude u otro): mejor calidad contextual, pero con costo; sigue como mejora futura opcional (ADR-003).
- es.wiktionary como fuente prioritaria: puede sumarse después; no está en el volcado actual.

## Consecuencias
- Más lento que Argos; se mide en RNF-04 al verificar RF-43.
- Los libros ya procesados deben reprocesarse para tener las traducciones nuevas.
- Crédito a Opus-MT (Helsinki-NLP, Universidad de Helsinki; Apache-2.0) en esta ADR y en la página de créditos cuando exista.
