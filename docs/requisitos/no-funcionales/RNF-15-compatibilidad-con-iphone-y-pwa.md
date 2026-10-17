# RNF-15 — Compatibilidad con iPhone y PWA

| Campo | Valor |
|---|---|
| **ID** | RNF-15 |
| **Título** | Compatibilidad con iPhone y PWA |
| **Módulo** | M-T Transversal |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-36](../funcionales/RF-36-interfaz-responsive-en-celular-tablet-y-computador.md) |
| **Reglas de negocio** | — |

## Descripción
La aplicación funciona completa en Safari iOS 16 o superior, se puede instalar como PWA ("Añadir a pantalla de inicio") y respeta las zonas seguras de la pantalla.

## Justificación
En el curso hay iPhones, y Safari tiene diferencias importantes con Chrome (gestos, ventanas emergentes, visor).

## Criterios de aceptación
1. La suite E2E se ejecuta también en WebKit (Playwright, perfil iPhone 13) sin fallos.
2. La PWA tiene manifest, íconos y service worker; instalada, abre a pantalla completa y el inicio de sesión con Google vuelve a la app.
3. Ningún control queda bajo el notch ni bajo la barra de inicio (usa env(safe-area-inset-*)).
4. Ninguna función depende de hover; el gesto de deslizar para pasar página no interfiere con el gesto "atrás" de Safari.
