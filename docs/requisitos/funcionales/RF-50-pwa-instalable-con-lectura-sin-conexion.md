# RF-50 — PWA instalable con lectura sin conexión

| Campo                 | Valor                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| **ID**                | RF-50                                                                 |
| **Título**            | PWA instalable con lectura sin conexión                               |
| **Módulo**            | M-T Transversal                                                       |
| **Prioridad**         | Alta                                                                  |
| **Fase**              | 6                                                                     |
| **Estado**            | En curso                                                               |
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

2026-10-20 (rama `feat/RF-50-pwa`), build de producción local (`next start`) y Playwright con `E2E_BASE_URL`:

- Criterio 1: cumplido (`lib/pwa/manifest.test.ts`; `e2e/pwa.spec.ts`: `/manifest.webmanifest` 200, `display: standalone`, `start_url: /grupos` y los PNG existen con el tamaño declarado, incluido apple-touch 180).
- Criterio 2: cumplido en Chromium 360/768/1280 (`lib/pwa/sw-routing.test.ts` para `routeFor`; e2e: tras visitar `/lector/demo`, sin conexión la recarga muestra el texto tocable y una ruta no visitada muestra la página sin conexión). **No se pudo verificar:** imágenes y JSON de un libro real con sesión (no hay Supabase local); el comportamiento de Supabase/`POST`/`/auth/*`/`/api/cuenta/*` solo por red está probado en `routeFor` (son rutas que el SW ni intercepta), no contra el servidor real.
- Criterio 3: la purga al cambiar de usuaria y al recibir `purge` está probada en e2e (Chromium) y en `components/pwa-register.test.tsx`; el SW además purga por sí mismo cuando ve el `POST /auth/signout`. El aviso «Hay una versión nueva · Actualizar» está probado con componente (worker en espera simulado). **No se pudo verificar:** cierre de sesión real de punta a punta y actualización real entre dos despliegues.
- Criterio 4: cumplido (el registro exige `NODE_ENV === 'production'`, probado; sección «Lectura sin conexión» en `/privacidad`). WebKit iPhone: el SW se registra.
- Criterio 5: cumplido con pruebas de componente y de dominio (`app/perfil/install-card.test.tsx`, `lib/pwa/install.test.ts`: botón con `beforeinstallprompt`, pasos de Safari en iPhone, oculta si ya está instalada). **No se pudo verificar:** en un Android o iPhone físicos.
- Criterio 6: **pendiente de la usuaria** (iPhone real): instalar con «Compartir -> Añadir a pantalla de inicio», abrir desde el ícono y entrar con Google. El inicio de sesión vuelve por `${origin}/auth/callback`, dentro del alcance `/`, y `/auth/*` va siempre por red.
- Decisiones autónomas: (a) la página sin conexión es `public/offline.html`, HTML estático sin JavaScript de Next, porque una página de Next servida bajo otra URL no se hidrata y quedaba en blanco; (b) el JSON de página usa red primero con copia de respaldo (puede reprocesarse) y la imagen caché primero; (c) solo se guardan navegaciones de `/lector/demo` y `/libros/<id>` (las demás pantallas con datos personales nunca se guardan); (d) el SW recuerda la usuaria en un caché `md-meta` y, sin usuaria conocida, no guarda ni sirve nada; (e) el e2e de PWA corre en el CI con una build de producción.
