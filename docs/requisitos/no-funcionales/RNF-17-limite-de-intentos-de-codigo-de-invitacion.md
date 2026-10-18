# RNF-17 — Límite de intentos de código de invitación

| Campo                 | Valor                                              |
| --------------------- | -------------------------------------------------- |
| **ID**                | RNF-17                                             |
| **Título**            | Límite de intentos de código de invitación         |
| **Módulo**            | M-2 Grupos                                         |
| **Prioridad**         | Alta                                               |
| **Fase**              | 3                                                  |
| **Estado**            | Pendiente                                          |
| **Dependencias**      | [RF-07](../funcionales/RF-07-unirse-a-un-grupo.md) |
| **Reglas de negocio** | RN-03, RN-09                                       |

## Descripción

El código de invitación tiene 8 caracteres. Para que no se pueda adivinar probando muchos códigos, `join_group` limita los intentos fallidos por usuario.

## Justificación

Entrar a un grupo da acceso a todos sus libros (RN-03). Sin límite, un usuario con sesión podría probar códigos de forma automática.

## Criterios de aceptación

1. Un usuario que falla 10 veces en una hora recibe «Demasiados intentos, inténtalo más tarde» y `join_group` rechaza incluso códigos válidos hasta que pase la hora.
2. Los intentos exitosos no cuentan.
3. Un usuario no puede ver ni borrar los intentos de otro (RLS).
