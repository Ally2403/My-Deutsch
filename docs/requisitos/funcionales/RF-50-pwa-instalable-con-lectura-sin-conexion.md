# RF-50 — PWA instalable con lectura sin conexión

| Campo                 | Valor                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| **ID**                | RF-50                                                                 |
| **Título**            | PWA instalable con lectura sin conexión                               |
| **Módulo**            | M-T Transversal                                                       |
| **Prioridad**         | Alta                                                                  |
| **Fase**              | 6                                                                     |
| **Estado**            | Pendiente                                                             |
| **Dependencias**      | [RNF-15](../no-funcionales/RNF-15-compatibilidad-con-iphone-y-pwa.md) |
| **Reglas de negocio** | RN-04                                                                 |

## Descripción

La app es instalable (manifiesto e íconos) y un service worker propio permite leer sin conexión lo ya visto. Reemplaza la decisión «solo web» (ver [ADR-008](../../decisiones/ADR-008-pwa-con-service-worker-propio.md)).

## Justificación

La usuaria pidió volver a tener PWA.

## Criterios de aceptación

1. `/manifest.webmanifest` válido con íconos 192, 512, maskable y apple-touch; `display: standalone`, `start_url: /grupos`.
2. El service worker sirve estáticos con caché primero, navegaciones con red primero y `/offline` sin red; imágenes y JSON de páginas con caché acotado por usuaria; Supabase, `POST`, `/auth/*` y `/api/cuenta/*` solo por red.
3. Al cerrar sesión o cambiar de usuaria se purgan los cachés de datos; una versión nueva muestra «Hay una versión nueva · Actualizar».
4. Se registra solo en producción; la política de privacidad lo explica.
5. Tarjeta «Instalar en tu celular» (botón en Android, pasos en iPhone, oculta si ya está instalada).
6. Queda sin verificar hasta que la usuaria lo pruebe: instalar y entrar con Google en un iPhone real.

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-20. Plan: [`superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md`](../../superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md).

## Verificación

Pendiente.
