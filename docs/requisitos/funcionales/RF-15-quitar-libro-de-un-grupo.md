# RF-15 — Quitar libro de un grupo

| Campo | Valor |
|---|---|
| **ID** | RF-15 |
| **Título** | Quitar libro de un grupo |
| **Módulo** | M-3 Biblioteca |
| **Prioridad** | Baja |
| **Fase** | 4 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-14](RF-14-ver-biblioteca-del-grupo.md) |
| **Reglas de negocio** | RN-08, RN-11 |

## Descripción
Quien subió el libro, o un administrador, puede quitarlo del grupo. Se aplica la regla de eliminación diferida RN-11.

## Justificación
Corrige errores de subida y libera espacio del plan gratuito.

## Criterios de aceptación
1. Tras confirmar, el libro deja de aparecer en el grupo.
2. Si no queda vinculado a ningún grupo, sus archivos se eliminan pasados 7 días, y las palabras del diccionario personal se conservan.
