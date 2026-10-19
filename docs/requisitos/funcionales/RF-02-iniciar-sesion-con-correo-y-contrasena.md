# RF-02 — Iniciar sesión con correo y contraseña

| Campo | Valor |
|---|---|
| **ID** | RF-02 |
| **Título** | Iniciar sesión con correo y contraseña |
| **Módulo** | M-1 Cuenta |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-01](RF-01-registrar-usuario-con-correo-y-contrasena.md) |
| **Reglas de negocio** | — |

## Descripción
El sistema permite que un usuario registrado inicie sesión con su correo y contraseña. Si las credenciales son válidas, abre su página de inicio, o la página que intentaba abrir (p. ej. un enlace de invitación).

## Justificación
Es la puerta de acceso a todas las funciones protegidas y a la aplicación de la privacidad (RN-04).

## Criterios de aceptación
1. Con credenciales correctas, se crea una sesión y se redirige al destino pendiente o al inicio.
2. Con credenciales incorrectas, se muestra "Correo o contraseña incorrectos" sin indicar cuál campo falló.
3. Tras 5 intentos fallidos en 15 minutos, el acceso queda limitado temporalmente (límite de Supabase Auth).
4. La sesión persiste al cerrar y reabrir el navegador o la PWA durante al menos 7 días.

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
