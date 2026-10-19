# RF-18 — Modo lectura adaptado

| Campo | Valor |
|---|---|
| **ID** | RF-18 |
| **Título** | Modo lectura adaptado |
| **Módulo** | M-5 Lector |
| **Prioridad** | Media |
| **Fase** | 4 |
| **Estado** | Hecho |
| **Dependencias** | [RF-12](RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | — |

## Descripción
Además de la vista original, existe un modo "lectura" que muestra el texto de la página como párrafos ajustados al ancho de la pantalla, con tamaño de letra configurable y con las mismas funciones de palabra.

## Justificación
En un celular de 360 px, una página escaneada completa queda pequeña; el texto ajustado se lee sin hacer zoom.

## Criterios de aceptación
1. El modo lectura muestra los párrafos en el orden del original, sin desplazamiento horizontal desde 360 px.
2. Las ilustraciones de la página se muestran recortadas entre los párrafos o como miniatura que se amplía.
3. Tocar palabras, colores y marcas de "vista" funcionan igual que en la vista original.
