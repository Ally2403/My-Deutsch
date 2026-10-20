# RNF-19 — Rendimiento de lectura

| Campo                 | Valor                                                                               |
| --------------------- | ----------------------------------------------------------------------------------- |
| **ID**                | RNF-19                                                                              |
| **Título**            | Rendimiento de lectura                                                              |
| **Módulo**            | M-5 Lector                                                                          |
| **Prioridad**         | Media                                                                               |
| **Fase**              | 6                                                                                   |
| **Estado**            | Pendiente                                                                           |
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

Por medir (Tarea 6.1).

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-20. Plan: [`superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md`](../../superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md).

## Verificación

Pendiente.
