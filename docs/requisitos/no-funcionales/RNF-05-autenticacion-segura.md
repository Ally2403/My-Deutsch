# RNF-05 — Autenticación segura

| Campo | Valor |
|---|---|
| **ID** | RNF-05 |
| **Título** | Autenticación segura |
| **Módulo** | M-1 Cuenta |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-01](../funcionales/RF-01-registrar-usuario-con-correo-y-contrasena.md), [RF-02](../funcionales/RF-02-iniciar-sesion-con-correo-y-contrasena.md), [RF-03](../funcionales/RF-03-iniciar-sesion-con-google.md) |
| **Reglas de negocio** | — |

## Descripción
Las contraseñas se almacenan con hash bcrypt (Supabase Auth), las sesiones usan JWT de corta duración con renovación, y todo el tráfico va por HTTPS.

## Justificación
Requisito mínimo de seguridad (OWASP) para cualquier sistema con cuentas.

## Criterios de aceptación
1. En la tabla auth.users, la columna de contraseña siempre tiene el prefijo $2a$ o $2b$, nunca texto legible.
2. Las peticiones HTTP se redirigen a HTTPS y la cabecera Strict-Transport-Security está presente.
3. Ninguna clave service_role existe en el código del cliente ni en el repositorio (lo verifica el hook guard-secrets).
