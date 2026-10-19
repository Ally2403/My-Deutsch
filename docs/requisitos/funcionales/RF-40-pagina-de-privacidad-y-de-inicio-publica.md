# RF-40 — Página de inicio pública y política de privacidad

| Campo | Valor |
|---|---|
| **ID** | RF-40 |
| **Título** | Página de inicio pública y política de privacidad |
| **Módulo** | M-1 Cuenta |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente (aprobado 2026-10-17) |
| **Dependencias** | [RF-03](RF-03-iniciar-sesion-con-google.md) |
| **Reglas de negocio** | RN-03, RN-04 |

## Descripción
La aplicación tiene una página de inicio accesible sin sesión que explica qué es My-Deutsch y enlaza a `/privacidad`, una política de privacidad en español que dice qué datos se guardan (correo, nombre, avatar, progreso, diccionario personal, anotaciones, libros subidos al grupo), quién puede verlos (RN-03, RN-04) y cómo pedir su eliminación.

## Justificación
Google exige una página de inicio y una política de privacidad en el dominio de la aplicación para publicar el cliente OAuth fuera del modo de prueba; sin ello solo podrían entrar los usuarios de prueba (máx. 100) y el curso no podría usar el inicio de sesión con Google.

## Criterios de aceptación
1. `/` y `/privacidad` se abren sin iniciar sesión y se leen bien en 360 px.
2. La política enumera los datos guardados, su visibilidad y un correo de contacto para pedir su eliminación.
3. Ambas URLs están registradas en la pantalla de consentimiento de Google y la verificación de marca queda aprobada.
4. Los libros del grupo nunca aparecen en páginas públicas (RN-03).

## Verificación (2026-10-19)
- Criterios 1, 2, 4 ✅ e2e y auditoría previa. Criterio 3 ✅ según la usuaria: publicó el cliente OAuth de Google en producción con las URLs de inicio y privacidad (no verificado por Claude; no hay acceso a la consola de Google).
