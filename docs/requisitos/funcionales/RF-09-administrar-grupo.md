# RF-09 — Administrar grupo

| Campo | Valor |
|---|---|
| **ID** | RF-09 |
| **Título** | Administrar grupo |
| **Módulo** | M-2 Grupos |
| **Prioridad** | Media |
| **Fase** | 4 |
| **Estado** | Hecho |
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

## Verificación (2026-10-19)
- Migración `20261019110000_administrar_grupo.sql` (aplicada): `remove_member`, `set_member_role`,
  `delete_group` (+ `regenerate_invite` y la política de renombrar ya existentes). UI: panel
  «Administrar grupo» y acciones por miembro solo para administradores (`components/group-admin.tsx`).
- Criterio 1 ✅ en la base real (transacción con rollback): al regenerar, el código anterior ya no
  existe en `groups`.
- Criterio 2 ✅ expulsar quita la membresía (sin membresía no hay acceso a libros por RLS) y el
  diccionario de la persona expulsada sigue intacto (1 fila antes y después).
- Criterio 3 ✅ un miembro que no es administrador recibe `42501 forbidden` al expulsar, borrar el
  grupo o regenerar el código, y 0 filas al renombrar; `anon` no tiene permiso de ejecución. Además:
  nadie puede expulsarse a sí mismo (`use_leave_group`) ni dejar al grupo sin administradores
  (`last_admin`). Eliminar el grupo exige escribir su nombre.
- Sin verificar con sesión real en el navegador.
