# RF-03 — Iniciar sesión con Google

| Campo | Valor |
|---|---|
| **ID** | RF-03 |
| **Título** | Iniciar sesión con Google |
| **Módulo** | M-1 Cuenta |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | — |
| **Reglas de negocio** | — |

## Descripción
El sistema permite registrarse e iniciar sesión con una cuenta de Google (OAuth 2.0). Si es el primer ingreso, se crea el perfil con el nombre y la foto de Google.

## Justificación
Es la forma más rápida para la mayoría del curso y evita recordar otra contraseña.

## Criterios de aceptación
1. Al pulsar "Continuar con Google" y aceptar, el usuario queda autenticado y se crea su perfil si no existía.
2. En Safari iOS y en la PWA instalada el flujo usa redirección (no ventana emergente) y regresa a la aplicación.
3. Si el correo de Google ya existe como cuenta de correo y contraseña, ambas formas de acceso quedan vinculadas a la misma cuenta.

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
