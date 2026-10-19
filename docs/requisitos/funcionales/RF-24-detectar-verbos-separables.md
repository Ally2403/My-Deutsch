# RF-24 — Detectar verbos separables

| Campo | Valor |
|---|---|
| **ID** | RF-24 |
| **Título** | Detectar verbos separables |
| **Módulo** | M-6 Léxico |
| **Prioridad** | Media |
| **Fase** | 4 |
| **Estado** | Hecho |
| **Dependencias** | [RF-23](RF-23-resolver-formas-flexionadas-al-lema.md) |
| **Reglas de negocio** | RN-07 |

## Descripción
Cuando el verbo y su partícula están separados en la oración, ambos se asocian al verbo compuesto, y al tocar uno se resalta el otro.

## Justificación
Los verbos separables son muy frecuentes en B1 y su significado cambia por completo ("hören" vs. "aufhören").

## Criterios de aceptación
1. En "Er ruft sie morgen an", tocar "ruft" o "an" muestra "anrufen" y resalta ambas palabras.
2. En el conjunto de prueba, ≥ 80 % de los verbos separables con partícula separada se detectan correctamente.

## Verificación (2026-10-19)
- Criterio 1 ✅ `test_separable_verb_pair_is_linked_both_ways`: «ruft … an» → *anrufen* en ambas palabras; el lector ya resalta la pareja (`sep`, RN-07).
- Criterio 2 ✅ 29/30 = 97 % en `worker/tests/fixtures/separable_sentences.tsv` (30 oraciones B1) con el léxico real. Fallo conocido: «bereitest … vor» (spaCy lematiza *bereiten*). spaCy marca `svp` en la mayoría; la **regla de respaldo** (`trailing_particle_pairs`) une una partícula que cierra la cláusula al verbo conjugado más cercano de la misma cláusula si el compuesto existe como verbo en el léxico.
- Sin verificar: libro real procesado en Actions (hay que reprocesar los libros para ver el cambio).
