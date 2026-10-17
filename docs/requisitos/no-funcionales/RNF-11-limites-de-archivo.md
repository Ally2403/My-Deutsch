# RNF-11 — Límites de archivo

| Campo | Valor |
|---|---|
| **ID** | RNF-11 |
| **Título** | Límites de archivo |
| **Módulo** | M-3 Biblioteca |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-11](../funcionales/RF-11-subir-pdf-escaneado-a-un-grupo.md) |
| **Reglas de negocio** | — |

## Descripción
Se aceptan PDF de hasta 50 MB y 400 páginas; las imágenes de página se guardan en WebP con lado mayor de 1 600 px y ≤ 250 KB de media por página.

## Justificación
Mantiene el almacenamiento dentro del plan gratuito (1 GB) para unos 25 libros.

## Criterios de aceptación
1. Un PDF de 51 MB o de 401 páginas se rechaza con un mensaje claro.
2. En el libro de prueba, el tamaño medio por página procesada es ≤ 250 KB.

## Nota de cambio (2026-10-17)
El límite baja de 100 MB a 50 MB: es el máximo por archivo del plan gratuito de Supabase Storage. Aprobado por la usuaria. Un PDF mayor se comprime antes de subirlo.
