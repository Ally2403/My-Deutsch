# RF-07 — Unirse a un grupo

| Campo | Valor |
|---|---|
| **ID** | RF-07 |
| **Título** | Unirse a un grupo |
| **Módulo** | M-2 Grupos |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-06](RF-06-crear-grupo.md) |
| **Reglas de negocio** | RN-09 |

## Descripción
El lector se une a un grupo escribiendo el código de invitación o abriendo el enlace. Si no tiene sesión, primero inicia sesión y luego vuelve a la invitación.

## Justificación
Es la forma en que los compañeros acceden a los libros del curso.

## Criterios de aceptación
1. Con un código válido, el usuario queda como miembro y ve la biblioteca del grupo.
2. Con un código inexistente o regenerado, se muestra "Código no válido".
3. Si ya es miembro, se abre el grupo sin duplicar la membresía.
4. Si el grupo tiene 50 miembros, se rechaza con "El grupo está lleno".

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
