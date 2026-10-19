# RNF-13 — Portabilidad de datos y respaldo

| Campo | Valor |
|---|---|
| **ID** | RNF-13 |
| **Título** | Portabilidad de datos y respaldo |
| **Módulo** | M-T Transversal |
| **Prioridad** | Baja |
| **Fase** | 5 |
| **Estado** | Hecho |
| **Dependencias** | [RF-32](../funcionales/RF-32-exportar-diccionario-personal.md) |
| **Reglas de negocio** | — |

## Descripción
El usuario puede exportar su diccionario (RF-32) y la base de datos se respalda semanalmente fuera de Supabase.

## Justificación
El plan gratuito de Supabase no incluye respaldos con punto de restauración.

## Criterios de aceptación
1. Un workflow semanal de Actions guarda pg_dump cifrado como artefacto privado, retenido 30 días.
2. Restaurar el respaldo en una base local recupera el 100 % de las filas de user_words.

## Verificación
2026-10-19: c1: la usuaria creó los secretos y la ejecución manual del workflow `respaldo` terminó en verde (tras corregir el usuario del Session pooler: `postgres.<id del proyecto>`). c2: restauración probada en Docker con Postgres 17, migraciones reales y 150 filas de `user_words` (150/150), y con un respaldo cifrado de prueba (7/7). Falta solo, cuando quiera, la Parte B de `docs/respaldo.md` con el respaldo real.
