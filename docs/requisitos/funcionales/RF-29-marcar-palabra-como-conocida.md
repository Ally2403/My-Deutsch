# RF-29 — Marcar palabra como conocida

| Campo | Valor |
|---|---|
| **ID** | RF-29 |
| **Título** | Marcar palabra como conocida |
| **Módulo** | M-7 Vocabulario personal |
| **Prioridad** | Media |
| **Fase** | 4 |
| **Estado** | En progreso |
| **Dependencias** | [RF-27](RF-27-guardar-palabras-en-el-diccionario-personal.md) |
| **Reglas de negocio** | RN-05 |

## Descripción
Desde el panel o desde el diccionario, el usuario puede marcar una palabra como "conocida", volverla a "vista" o eliminarla del diccionario.

## Justificación
Permite distinguir lo que ya se domina de lo que solo se consultó.

## Criterios de aceptación
1. El cambio de estado se refleja de inmediato en el texto y en el diccionario.
2. Eliminar una palabra pide confirmación y quita la marca del texto.

## Verificación (2026-10-19)
- Desde el diccionario: marcar «conocida»/volver a «vista» y eliminar con confirmación (pruebas de componente; el error de red avisa y no cambia el estado).
- Pendiente: hacerlo también desde el panel del lector y reflejarlo en el texto (criterios 1 y 2 en el lector); depende de RF-28.
