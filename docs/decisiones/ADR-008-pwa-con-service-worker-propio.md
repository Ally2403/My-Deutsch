# ADR-008 · PWA con service worker propio (reemplaza la decisión «solo web» y el uso de `@serwist/next` de ADR-004)

**Estado:** Aceptada (2026-10-20) · **Reemplaza:** la parte de PWA de [ADR-004](ADR-004-stack-nextjs-supabase.md) (`@serwist/next`) y la decisión «solo web» del 2026-10-19 · **Requisitos:** RF-50, RNF-15

## Contexto

ADR-004 preveía PWA con `@serwist/next`, que se apoya en el empaquetador webpack; Next 16 usa Turbopack. El 2026-10-19 la usuaria descartó la PWA para terminar antes (RNF-15 c2); el 2026-10-20 pidió volver a tenerla.

## Decisión

Se escribe a mano un service worker (`public/sw.js`) y un `app/manifest.ts`, sin dependencia nueva de ejecución (`sharp` solo como devDependency para generar íconos). Estrategias: estáticos con caché primero; navegaciones con red primero y `/offline`; imágenes y JSON de páginas con caché acotado por usuaria; todo lo demás solo red. Se purga al cerrar sesión. Se registra solo en producción.

## Consecuencias

- RNF-15 c2 queda **reactivado por RF-50**.
- Hay que mantener la versión del SW y el aviso de actualización.
- Privacidad: las páginas leídas se guardan en el dispositivo y se borran al cerrar sesión (se indica en la política de privacidad).

## Implementación (2026-10-20, RF-50)

- La página sin conexión es `public/offline.html` (estática, sin JavaScript de Next) y no `/offline` de Next: servir el HTML de una ruta de Next bajo otra URL impide la hidratación y deja la pantalla en blanco. Una respuesta con `redirected` tampoco puede usarse como respuesta de navegación, así que se recrea al precachearla.
- Privacidad: los cachés de datos se llaman `md-data-<versión>-<usuaria>`; el SW guarda la usuaria en `md-meta`, purga al recibir `purge`, al cambiar de usuaria y al ver el `POST /auth/signout`; sin usuaria conocida no guarda ni sirve datos. Solo se guardan navegaciones de `/lector/demo` y `/libros/<id>`.
- El JSON de página va con red primero y copia de respaldo; la imagen, caché primero. Peticiones RSC, otros orígenes (Supabase), `POST`, `/auth/*` y `/api/cuenta/*` no se interceptan.
- La versión nueva espera (sin `skipWaiting` automático); el aviso «Hay una versión nueva · Actualizar» envía `skip-waiting` y recarga una sola vez.
