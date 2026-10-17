# RF-23 — Resolver formas flexionadas al lema

| Campo | Valor |
|---|---|
| **ID** | RF-23 |
| **Título** | Resolver formas flexionadas al lema |
| **Módulo** | M-6 Léxico |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-12](RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | RN-06 |

## Descripción
Las formas conjugadas, declinadas, comparativas y plurales se resuelven a su lema durante el procesamiento (p. ej. "kleinen" → "klein", "Kindern" → "Kind", "gehst" → "gehen").

## Justificación
Sin esto, la mayoría de las palabras del texto no se encontrarían en el diccionario.

## Criterios de aceptación
1. En el conjunto de prueba de 300 palabras de libros reales (definido en la Fase 2), ≥ 90 % de las formas flexionadas se resuelven al lema correcto.
