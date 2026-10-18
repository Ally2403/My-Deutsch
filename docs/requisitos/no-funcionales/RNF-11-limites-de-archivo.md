# RNF-11 — Límites de archivo

| Campo | Valor |
|---|---|
| **ID** | RNF-11 |
| **Título** | Límites de archivo |
| **Módulo** | M-3 Biblioteca |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | En progreso |
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

## Verificación
Entrega 2c (2026-10-18): la ruta `POST /api/libros/finalizar` rechaza un PDF de más de 50 MB (`too_large`, probado con un tope reducido) y lo borra de Storage; el bucket `uploads` ya limita a 52 428 800 bytes. Criterio 1, parte de las 401 páginas: la aplica el worker (sin verificar de extremo a extremo). Criterio 2: sin verificar.

Entrega 2d (2026-10-18): la pantalla de subida rechaza en el navegador, antes de subir, un archivo de más de 50 MB, vacío o que no es PDF, con el mensaje «El PDF supera el límite de 50 MB. Comprímelo y vuelve a intentarlo» (pruebas). El límite de 400 páginas lo aplica el worker (`too_many_pages`, mensaje en `summarizeError`); sin verificar de extremo a extremo.
