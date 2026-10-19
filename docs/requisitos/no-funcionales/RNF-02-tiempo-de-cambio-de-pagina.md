# RNF-02 — Tiempo de cambio de página

| Campo | Valor |
|---|---|
| **ID** | RNF-02 |
| **Título** | Tiempo de cambio de página |
| **Módulo** | M-5 Lector |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-16](../funcionales/RF-16-pasar-paginas.md) |
| **Reglas de negocio** | — |

## Descripción
Pasar a la página siguiente o anterior muestra la imagen y la capa de texto en menos de 500 ms en el percentil 95.

## Justificación
La sensación de libro depende de que pasar página sea inmediato.

## Criterios de aceptación
1. En la prueba de 50 cambios consecutivos con 4G rápido simulado, p95 < 500 ms.
2. Las imágenes se sirven en WebP desde CDN con caché inmutable (Cache-Control con max-age ≥ 1 año).

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
- p95 de cambio de página 146–167 ms en 50 cambios con «4G rápido» y CPU ×4 (`e2e/lector.spec.ts`, imágenes del demo). **Desviación del criterio 2:** las páginas de los libros son privadas (RLS, RN-03), así que se sirven desde la app con `Cache-Control: private, max-age=604800` (7 días, RNF-10) y no desde un CDN con caché inmutable de 1 año; la usuaria debe aprobar este cambio de criterio. Con páginas reales (≤ 250 KB) una carga en frío a 1,6 Mbit/s tarda ≈ 1,3 s, pero el lector precarga las páginas vecinas.
