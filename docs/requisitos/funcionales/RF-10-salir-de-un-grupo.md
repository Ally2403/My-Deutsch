# RF-10 — Salir de un grupo

| Campo | Valor |
|---|---|
| **ID** | RF-10 |
| **Título** | Salir de un grupo |
| **Módulo** | M-2 Grupos |
| **Prioridad** | Media |
| **Fase** | 4 |
| **Estado** | Hecho |
| **Dependencias** | [RF-07](RF-07-unirse-a-un-grupo.md) |
| **Reglas de negocio** | RN-08 |

## Descripción
El miembro puede salir de un grupo. Si es el último administrador, el rol se transfiere según RN-08.

## Justificación
El curso cambia cada semestre; los grupos viejos no deben quedar en la vista.

## Criterios de aceptación
1. Tras confirmar, el grupo desaparece de "Mis grupos" y su diccionario personal se conserva.
2. Si era el último administrador, el miembro más antiguo pasa a ser administrador.

## Verificación (2026-10-19)
- Botón «Salir del grupo» con confirmación en la página del grupo; llama a `leave_group` (RN-08:
  el miembro más antiguo pasa a administrador si se va el último; si no quedan miembros, el grupo
  se elimina) y vuelve a «Mis grupos».
- Criterio 1 ✅ pruebas de componente (confirma, llama a la función, redirige; si falla avisa y se
  queda); el diccionario personal no depende del grupo.
- Criterio 2 ✅ lo cubre `leave_group` (migración base) y la prueba RLS existente.
- Sin verificar con sesión real en el navegador.
