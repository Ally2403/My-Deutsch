# RNF-13 — Portabilidad de datos y respaldo

| Campo | Valor |
|---|---|
| **ID** | RNF-13 |
| **Título** | Portabilidad de datos y respaldo |
| **Módulo** | M-T Transversal |
| **Prioridad** | Baja |
| **Fase** | 5 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-32](../funcionales/RF-32-exportar-diccionario-personal.md) |
| **Reglas de negocio** | — |

## Descripción
El usuario puede exportar su diccionario (RF-32) y la base de datos se respalda semanalmente fuera de Supabase.

## Justificación
El plan gratuito de Supabase no incluye respaldos con punto de restauración.

## Criterios de aceptación
1. Un workflow semanal de Actions guarda pg_dump cifrado como artefacto privado, retenido 30 días.
2. Restaurar el respaldo en una base local recupera el 100 % de las filas de user_words.
