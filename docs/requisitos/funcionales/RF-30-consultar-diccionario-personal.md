# RF-30 — Consultar diccionario personal

| Campo | Valor |
|---|---|
| **ID** | RF-30 |
| **Título** | Consultar diccionario personal |
| **Módulo** | M-7 Vocabulario personal |
| **Prioridad** | Alta |
| **Fase** | 4 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-27](RF-27-guardar-palabras-en-el-diccionario-personal.md) |
| **Reglas de negocio** | RN-04 |

## Descripción
Una pantalla lista todas las palabras del usuario con artículo coloreado, lema, significado principal, contador y fecha, y permite buscar por texto en alemán o en español.

## Justificación
La usuaria quiere observar su vocabulario aprendido.

## Criterios de aceptación
1. La lista carga 2 000 palabras en < 1 s con desplazamiento fluido (virtualizado).
2. La búsqueda encuentra coincidencias parciales en lema o significado, sin distinguir mayúsculas ni tildes, y trata "ß"/"ss" y "ä"/"ae" como equivalentes.
3. Al tocar una palabra se ven todos sus significados y la oración donde apareció, con un enlace a esa página del libro.
