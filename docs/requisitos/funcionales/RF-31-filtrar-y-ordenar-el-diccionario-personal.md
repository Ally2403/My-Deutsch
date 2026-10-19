# RF-31 — Filtrar y ordenar el diccionario personal

| Campo | Valor |
|---|---|
| **ID** | RF-31 |
| **Título** | Filtrar y ordenar el diccionario personal |
| **Módulo** | M-7 Vocabulario personal |
| **Prioridad** | Alta |
| **Fase** | 4 |
| **Estado** | En progreso |
| **Dependencias** | [RF-30](RF-30-consultar-diccionario-personal.md) |
| **Reglas de negocio** | — |

## Descripción
El diccionario se puede filtrar por tipo de palabra (sustantivo, verbo, adjetivo, adverbio, otros), por género (der, die, das), por estado (vista, conocida) y por libro, y ordenar por fecha, alfabéticamente o por número de consultas.

## Justificación
La usuaria pidió explícitamente filtrar por sustantivos, verbos, adjetivos y demás.

## Criterios de aceptación
1. Los filtros se combinan (p. ej. "sustantivos femeninos vistos en Libro A") y el resultado se actualiza en < 300 ms.
2. Cada filtro muestra el número de palabras que coinciden.
3. Los filtros activos se conservan en la URL, para compartir el enlace o volver atrás.

## Verificación (2026-10-19)
- Criterio 1 ✅ filtros combinables (tipo, género, estado, libro) y orden (recientes, A–Z, consultadas); filtrar 2 000 palabras tarda ~55–72 ms.
- Criterio 2 ✅ cada chip muestra su conteo aplicando los demás filtros.
- Criterio 3 ✅ filtros en la URL (`tipo`, `genero`, `estado`, `libro`, `orden`, `q`) y se restauran al abrir el enlace.
