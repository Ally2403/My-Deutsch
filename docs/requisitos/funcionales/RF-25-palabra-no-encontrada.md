# RF-25 — Palabra no encontrada

| Campo | Valor |
|---|---|
| **ID** | RF-25 |
| **Título** | Palabra no encontrada |
| **Módulo** | M-6 Léxico |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-21](RF-21-consultar-palabra.md) |
| **Reglas de negocio** | RN-12 |

## Descripción
Si la palabra no tiene entrada en el léxico (nombre propio, error de OCR o palabra rara), el panel lo indica, muestra la forma reconocida y ofrece enlaces para buscarla externamente.

## Justificación
Es mejor decir "no sé" que mostrar un significado incorrecto.

## Criterios de aceptación
1. El panel muestra "No encontramos esta palabra", la forma reconocida y enlaces a Wiktionary y a DWDS, que se abren en una pestaña nueva.
2. Permite editar la forma (corregir un error de OCR) y buscar de nuevo.

## Verificación (2026-10-19)
- Criterio 1 ✅ el panel dice «No encontramos esta palabra en el diccionario», muestra la forma y enlaza a Wiktionary y DWDS con `target="_blank"` y `rel="noopener"` (pruebas de componente y e2e).
- Criterio 2 ✅ campo para corregir la forma + «Buscar de nuevo»: una consulta a `lexicon` (variantes tal cual/minúscula/Mayúscula; `lib/domain/lexicon-search.ts`). Es la única petición del lector y solo ocurre en palabras sin entrada (RNF-01 intacto). Avisa si tampoco existe o si falla la red. El demo público usa una búsqueda de ejemplo («Katze»).
- Sin verificar contra la tabla `lexicon` real con sesión.
