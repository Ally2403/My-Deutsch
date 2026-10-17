# RF-04 — Cerrar sesión y recuperar contraseña

| Campo | Valor |
|---|---|
| **ID** | RF-04 |
| **Título** | Cerrar sesión y recuperar contraseña |
| **Módulo** | M-1 Cuenta |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-01](RF-01-registrar-usuario-con-correo-y-contrasena.md) |
| **Reglas de negocio** | — |

## Descripción
El sistema permite cerrar la sesión desde cualquier pantalla y solicitar un enlace de restablecimiento de contraseña por correo.

## Justificación
Los compañeros pueden usar computadores compartidos de la universidad; también es habitual olvidar la contraseña.

## Criterios de aceptación
1. Al cerrar sesión se invalida la sesión local y se redirige a la pantalla de ingreso.
2. Al solicitar recuperación con un correo registrado, llega un enlace válido por 1 hora; con uno no registrado, se muestra el mismo mensaje genérico.
3. El enlace permite definir una nueva contraseña que cumpla las reglas de RF-01.
