# RNF-17 — Límite de intentos de código de invitación

| Campo                 | Valor                                              |
| --------------------- | -------------------------------------------------- |
| **ID**                | RNF-17                                             |
| **Título**            | Límite de intentos de código de invitación         |
| **Módulo**            | M-2 Grupos                                         |
| **Prioridad**         | Alta                                               |
| **Fase**              | 3                                                  |
| **Estado**            | En progreso |
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

## Verificación
Entrega 2a (2026-10-18, pgTAP sobre el proyecto Supabase; `supabase/tests/join_attempts.test.sql`, 8/8):

1. ✅ Tras 10 fallos en una hora, `join_group` lanza `too_many_attempts` incluso con un código válido; con intentos de hace 2 h no bloquea. La app muestra «Demasiados intentos, inténtalo más tarde» (prueba Vitest); sin verificar en navegador.
2. ✅ Los intentos exitosos no se registran.
3. ✅ `authenticated` no puede leer `join_attempts` (sin privilegios ni políticas).

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
- Limitación conocida: el mensaje «Demasiados intentos» no se vio en el navegador (probado con Vitest y en la base).
