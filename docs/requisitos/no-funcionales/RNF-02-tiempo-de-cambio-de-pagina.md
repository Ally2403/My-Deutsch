# RNF-02 — Tiempo de cambio de página

| Campo | Valor |
|---|---|
| **ID** | RNF-02 |
| **Título** | Tiempo de cambio de página |
| **Módulo** | M-5 Lector |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-16](../funcionales/RF-16-pasar-paginas.md) |
| **Reglas de negocio** | — |

## Descripción
Pasar a la página siguiente o anterior muestra la imagen y la capa de texto en menos de 500 ms en el percentil 95.

## Justificación
La sensación de libro depende de que pasar página sea inmediato.

## Criterios de aceptación
1. En la prueba de 50 cambios consecutivos con 4G rápido simulado, p95 < 500 ms.
2. Las imágenes se sirven en WebP desde CDN con caché inmutable (Cache-Control con max-age ≥ 1 año).
