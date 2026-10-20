# RNF-15 — Compatibilidad con iPhone y PWA

| Campo | Valor |
|---|---|
| **ID** | RNF-15 |
| **Título** | Compatibilidad con iPhone y PWA |
| **Módulo** | M-T Transversal |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-36](../funcionales/RF-36-interfaz-responsive-en-celular-tablet-y-computador.md) |
| **Reglas de negocio** | — |

## Descripción
La aplicación funciona completa en Safari iOS 16 o superior, y respeta las zonas seguras de la pantalla.

## Justificación
En el curso hay iPhones, y Safari tiene diferencias importantes con Chrome (gestos, ventanas emergentes, visor).

## Criterios de aceptación
1. La suite E2E se ejecuta también en WebKit (Playwright, perfil iPhone 13) sin fallos.
2. ~~PWA instalable (manifest, íconos, service worker).~~ **Descartado por la usuaria (2026-10-19): solo web.** *Reactivado por [RF-50](../funcionales/RF-50-pwa-instalable-con-lectura-sin-conexion.md) (2026-10-20, [ADR-008](../../decisiones/ADR-008-pwa-con-service-worker-propio.md)).* En su lugar: el inicio de sesión con Google en Safari vuelve a la app (redirección, sin ventana emergente).
3. Ningún control queda bajo el notch ni bajo la barra de inicio (usa env(safe-area-inset-*)).
4. Ninguna función depende de hover; el gesto de deslizar para pasar página no interfiere con el gesto "atrás" de Safari.

## Decisión 2026-10-19
La usuaria decidió que la app sea solo web (sin PWA instalable) para terminar antes. Se mantiene todo lo demás: Safari iOS, WebKit en las pruebas, zonas seguras y ausencia de hover.

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
- Alcance: solo web, sin PWA instalable (decisión de la usuaria). Ingreso con Google por redirección y lector probados por la usuaria en iPhone real.
