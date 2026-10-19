# RF-43 — Calidad de las traducciones al español

| Campo | Valor |
|---|---|
| **ID** | RF-43 |
| **Título** | Calidad de las traducciones al español |
| **Módulo** | M-6 Léxico |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | En progreso |
| **Dependencias** | [RF-21](RF-21-consultar-palabra.md), [RF-12](RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | — |

## Descripción
Las acepciones en español de cada palabra deben ser las que un estudiante B1–C1 espera: primero la traducción corriente de la palabra (*die Hilfe → la ayuda*), y después los demás sentidos. Las definiciones en inglés de Wiktionary se limpian antes de traducirse ("the act of helping" no se traduce literalmente).

## Justificación
La usuaria probó un libro real y varias traducciones eran literales o rebuscadas (*die Hilfe* salía como «el actor de ayudar, asistencia»). Hoy el 100 % de las acepciones son traducción automática de una definición suelta en inglés.

## Criterios de aceptación
1. En un conjunto de prueba de ≥ 40 palabras del libro de muestra, la primera acepción es una traducción correcta y corriente en ≥ 90 % de los casos (la usuaria revisa las que ofrezcan dudas).
2. Ninguna acepción conserva fórmulas de definición ("acto de…", "persona o cosa que…") cuando existe una alternativa.
3. Sigue funcionando sin red al consultar (RNF-01) y sin costo (plan gratuito); cualquier modelo nuevo se instala con huella SHA-256 verificada.
4. El tiempo de procesamiento de un libro sigue dentro de RNF-04.
5. Las acepciones automáticas siguen marcadas como tales (`m: true`).

## Verificación
Pendiente.
