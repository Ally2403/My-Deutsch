# RF-06 — Crear grupo

| Campo | Valor |
|---|---|
| **ID** | RF-06 |
| **Título** | Crear grupo |
| **Módulo** | M-2 Grupos |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-02](RF-02-iniciar-sesion-con-correo-y-contrasena.md) |
| **Reglas de negocio** | RN-08, RN-09 |

## Descripción
El lector crea un grupo indicando un nombre (p. ej. "Alemán B1 – 2026-2"). Queda como administrador y el sistema genera el código y el enlace de invitación.

## Justificación
El grupo es el mecanismo que permite que 20 personas compartan un libro procesado una sola vez.

## Criterios de aceptación
1. Con un nombre de 3 a 60 caracteres, el grupo aparece en "Mis grupos" con el creador como administrador.
2. Se muestran el código de 8 caracteres y un botón para copiar o compartir el enlace (hoja de compartir nativa en móvil).
