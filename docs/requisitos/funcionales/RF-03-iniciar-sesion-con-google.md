# RF-03 — Iniciar sesión con Google

| Campo | Valor |
|---|---|
| **ID** | RF-03 |
| **Título** | Iniciar sesión con Google |
| **Módulo** | M-1 Cuenta |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
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

## Verificación (2026-10-19)
- Criterio 1 ✅ los logs de Auth muestran ingresos con Google (`provider_type: google`) de varias cuentas. Criterio 2 ✅ el flujo es por redirección (`signInWithOAuth`, sin ventana emergente); falta probar en Safari iPhone real (RNF-15). Criterio 3 ◐ sin probar: vinculación de una cuenta de correo con la de Google.
