# RF-01 — Registrar usuario con correo y contraseña

| Campo | Valor |
|---|---|
| **ID** | RF-01 |
| **Título** | Registrar usuario con correo y contraseña |
| **Módulo** | M-1 Cuenta |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | — |
| **Reglas de negocio** | — |

## Descripción
El sistema permite que un visitante cree una cuenta con nombre, correo electrónico y contraseña. Se envía un correo de verificación; al confirmarlo, el usuario queda autenticado y llega a su página de inicio.

## Justificación
Sin identidad de usuario no puede existir diccionario personal, progreso ni pertenencia a grupos. Algunos compañeros pueden no querer usar Google.

## Criterios de aceptación
1. Con datos válidos (correo único, contraseña ≥ 8 caracteres con al menos una letra y un número), se crea la cuenta y se envía el correo de verificación.
2. Con un correo ya registrado, se muestra "Este correo ya tiene una cuenta" y un enlace a iniciar sesión.
3. Con una contraseña inválida, el error se muestra en el formulario antes de enviar la solicitud.
4. La contraseña nunca se almacena en texto plano (ver RNF-05).

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
