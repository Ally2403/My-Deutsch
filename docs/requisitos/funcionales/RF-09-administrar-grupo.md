# RF-09 — Administrar grupo

| Campo | Valor |
|---|---|
| **ID** | RF-09 |
| **Título** | Administrar grupo |
| **Módulo** | M-2 Grupos |
| **Prioridad** | Media |
| **Fase** | 4 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-06](RF-06-crear-grupo.md) |
| **Reglas de negocio** | RN-08, RN-09 |

## Descripción
El administrador puede renombrar el grupo, regenerar el código de invitación, expulsar miembros, nombrar a otro administrador y eliminar el grupo.

## Justificación
Permite mantener el grupo ordenado (p. ej. cerrar invitaciones al iniciar el semestre).

## Criterios de aceptación
1. Al regenerar el código, el anterior deja de funcionar inmediatamente.
2. Un miembro expulsado pierde el acceso a los libros del grupo, pero conserva su diccionario personal.
3. Las acciones de administración no aparecen para quien no es administrador, y el servidor las rechaza con 403 si se invocan directamente.
