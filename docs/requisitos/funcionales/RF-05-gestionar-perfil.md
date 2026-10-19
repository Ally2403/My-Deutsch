# RF-05 — Gestionar perfil

| Campo | Valor |
|---|---|
| **ID** | RF-05 |
| **Título** | Gestionar perfil |
| **Módulo** | M-1 Cuenta |
| **Prioridad** | Baja |
| **Fase** | 4 |
| **Estado** | Hecho |
| **Dependencias** | [RF-01](RF-01-registrar-usuario-con-correo-y-contrasena.md) |
| **Reglas de negocio** | — |

## Descripción
El usuario puede ver y editar su nombre visible y su nivel de alemán declarado (A1–C2), y eliminar su cuenta.

## Justificación
El nombre identifica al usuario dentro de los grupos; eliminar la cuenta es un derecho básico sobre sus datos.

## Criterios de aceptación
1. Los cambios de nombre se reflejan en la lista de miembros de sus grupos.
2. Al eliminar la cuenta (con confirmación escrita), se borran su diccionario, progreso y anotaciones; los libros que subió permanecen en los grupos.

## Verificación (2026-10-19)
- Pantalla `/perfil` (enlace desde «Mis grupos»): nombre visible (2–60) y nivel A1–C2; eliminar
  cuenta con confirmación escrita («ELIMINAR») mediante `POST /api/cuenta/eliminar` (solo mismo
  origen y JSON; sale de cada grupo con `leave_group` y luego borra al usuario con la service role
  key, que solo vive en el servidor).
- Criterio 1 ✅ el nombre se guarda en `profiles` (RLS propia) y la lista de miembros lo lee de ahí
  (pruebas de componente y de dominio; edición verificada en la base real con rollback).
- Criterio 2 ✅ en la base real (rollback): tras salir del grupo y borrar el usuario desaparecen su
  diccionario, progreso, anotaciones y perfil; el libro que subió sigue en el grupo
  (`uploaded_by` nulo) y, si era la única administradora, el rol pasó al miembro restante.
- Sin verificar: la ruta de borrado contra el Auth real (la service role key solo está en Vercel y
  Actions); no se probó con una cuenta de verdad para no destruir datos.
