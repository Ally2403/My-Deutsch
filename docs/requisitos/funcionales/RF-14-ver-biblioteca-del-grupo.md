# RF-14 — Ver biblioteca del grupo

| Campo | Valor |
|---|---|
| **ID** | RF-14 |
| **Título** | Ver biblioteca del grupo |
| **Módulo** | M-3 Biblioteca |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-07](RF-07-unirse-a-un-grupo.md) |
| **Reglas de negocio** | RN-03 |

## Descripción
Cada grupo muestra sus libros con portada (primera página), título, número de páginas y el progreso personal del usuario en ese libro.

## Justificación
Es el punto de entrada a la lectura.

## Criterios de aceptación
1. Se listan solo los libros vinculados al grupo (RN-03), con portada en miniatura y porcentaje leído por el usuario actual.
2. Al tocar un libro, se abre en la última página leída (RN-14).

## Verificación
Entrega 2d (2026-10-18; Vitest 353/353):

- ✅ (pruebas y revisión de consultas) Criterio 1: la página del grupo lista solo los libros de `group_books` del grupo, con RLS (RN-03), portada (`/api/libros/<id>/paginas/1/imagen`, con inicial si no existe), título, «N páginas» y «0 % leído»; los datos de las páginas se sirven con la sesión de la persona (RLS, nunca service role).
- Sin verificar: criterio 2 (abrir en la última página leída): depende de RF-20 (hoy siempre abre en la página 1); RLS real de `pages` y de Storage con un segundo usuario que no es del grupo (solo probado con dobles); verificación visual en navegador.

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
