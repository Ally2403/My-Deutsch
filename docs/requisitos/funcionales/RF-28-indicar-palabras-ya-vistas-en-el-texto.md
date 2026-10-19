# RF-28 — Indicar palabras ya vistas en el texto

| Campo | Valor |
|---|---|
| **ID** | RF-28 |
| **Título** | Indicar palabras ya vistas en el texto |
| **Módulo** | M-7 Vocabulario personal |
| **Prioridad** | Alta |
| **Fase** | 4 |
| **Estado** | Hecho |
| **Dependencias** | [RF-27](RF-27-guardar-palabras-en-el-diccionario-personal.md) |
| **Reglas de negocio** | RN-05 |

## Descripción
En el lector, las palabras cuyo lema ya está en el diccionario personal se marcan sutilmente: subrayado punteado para "vista" y una marca más tenue para "conocida". Esta marca se puede ocultar.

## Justificación
Recordar que ya se buscó una palabra refuerza la memoria y evita buscarla otra vez sin pensar.

## Criterios de aceptación
1. Al abrir una página, todas las palabras de lemas vistos muestran la marca en < 200 ms.
2. El panel de una palabra ya vista indica "La viste N veces · primera vez en <libro>, pág. X".
3. Las marcas se combinan con el coloreo de sustantivos sin taparlo.

## Verificación (2026-10-19)
- Marca punteada («vista») o continua y tenue («conocida») bajo la caja de la palabra (`.seen-*`), sin tapar el resalte de género; el interruptor «Marcar palabras vistas» las oculta y se recuerda. Datos: `user_words` del usuario, cargados con la página del libro (sin peticiones por palabra).
- Criterio 1 ✅ el marcado es una búsqueda en un mapa local por página (sin red); e2e en Chromium 360/768/1280 y WebKit iPhone.
- Criterio 2 ✅ «La viste N veces · primera vez en <libro>, pág. X» desde la 2.ª consulta (pruebas de dominio y de panel; e2e).
- Criterio 3 ✅ e2e: `hl-m` y la marca punteada conviven.
- Sin verificar con datos reales de una sesión (el demo público usa un diccionario de ejemplo).
