# RF-20 — Recordar última página

| Campo | Valor |
|---|---|
| **ID** | RF-20 |
| **Título** | Recordar última página |
| **Módulo** | M-5 Lector |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | En progreso |
| **Dependencias** | [RF-16](RF-16-pasar-paginas.md) |
| **Reglas de negocio** | RN-14 |

## Descripción
El sistema guarda automáticamente la última página abierta por el usuario en cada libro y la usa al reabrirlo, en cualquier dispositivo.

## Justificación
Los estudiantes leen en el celular y luego continúan en el computador.

## Criterios de aceptación
1. Al reabrir el libro en otro dispositivo, se abre en la última página guardada (con un retraso máximo de 5 s entre dispositivos).

## Verificación (2026-10-19)
- Implementado: `lib/domain/progress.ts` (RN-14: 10 s por página leída, `resumePage`, `percentRead`), `useReadingProgress` (guarda con 1 s de retraso, sin romper la lectura si falla la red, y vacía lo pendiente al salir), `PageReader` con `initialPage`/`onPageChange`, `/libros/[id]` que abre en `last_page`, y «N % leído» real en la tarjeta del libro. Usa la tabla `reading_progress` existente (RLS propia, sin migración).
- Criterio 1 ◐ cubierto por pruebas unitarias (388/388) del flujo guardar → retomar; **sin verificar en dos dispositivos reales** (necesita sesión): leer en uno hasta la página N y abrir el libro en otro, ≤ 5 s después.
