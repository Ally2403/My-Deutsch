# RNF-19 — Rendimiento de lectura

| Campo                 | Valor                                                                               |
| --------------------- | ----------------------------------------------------------------------------------- |
| **ID**                | RNF-19                                                                              |
| **Título**            | Rendimiento de lectura                                                              |
| **Módulo**            | M-5 Lector                                                                          |
| **Prioridad**         | Media                                                                               |
| **Fase**              | 6                                                                                   |
| **Estado**            | En progreso                                                                          |
| **Dependencias**      | [RNF-02](RNF-02-tiempo-de-cambio-de-pagina.md), [RNF-08](RNF-08-rendimiento-web.md) |
| **Reglas de negocio** | —                                                                                   |

## Descripción

Precarga del JSON de la página siguiente y anterior (caché LRU de 5 con deduplicación) y recorte de JavaScript inicial con carga diferida de módulos secundarios, sin empeorar RNF-02 ni Lighthouse (85/90/90).

## Justificación

Pasar de página debe sentirse inmediato y la app debe cargar rápido en celular.

## Criterios de aceptación

1. Pasar a una página ya precargada llega al texto tocable en ≤ 100 ms.
2. Una página precargada no se vuelve a pedir; peticiones simultáneas iguales se deduplican; un error de red no envenena la caché.
3. Módulos no usados al abrir (anotaciones fuera del modo «Escribir», exportación CSV, `ts-fsrs`) se cargan de forma diferida.
4. Lighthouse local en `/`, `/login` y `/lector/demo` cumple los umbrales de `lighthouserc.json`; RNF-02 sigue verde.

## Línea base

Cambio a página precargada en la demo (dev, Chromium, sin throttling): 19–37 ms hasta el texto tocable (e2e `RNF-19`). RNF-02 (4G + CPU ×4) p95 148–220 ms. Lighthouse local sobre `next start` (mediana de 3): `/` 93/100/100, `/login` 91/100/100, `/lector/demo` 92/100/100.

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-20. Plan: [`superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md`](../../superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md).

## Verificación

- Criterio 1: verificado en Chromium (360/768/1280) con la demo; WebKit iPhone emulado en modo dev mide 100-340 ms (ruidoso) y solo se registra. Sin verificar en iPhone físico.
- Criterio 2: verificado con pruebas unitarias de `createPageCache` (`lib/domain/page-cache.test.ts`).
- Criterio 3: verificado en parte: `AnnotationLayer` (`next/dynamic`) y la exportación CSV (`import()` al pulsar) son diferidos; `ts-fsrs` ya vive solo en la ruta `/repaso` (lo importa solo `lib/domain/review.ts`, usado por esa pantalla), así que no se cambió. No se midió el ahorro de JS por ruta.
- Criterio 4: verificado en local (valores en la línea base) y e2e RNF-02 verde. El workflow `lighthouse` real corre tras un despliegue a producción.
- Decisión autónoma: la caché reemplaza el `Map` sin límite del lector; cambiar `loadPage` crea una caché nueva.
