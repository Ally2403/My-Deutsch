# RF-30 — Consultar diccionario personal

| Campo | Valor |
|---|---|
| **ID** | RF-30 |
| **Título** | Consultar diccionario personal |
| **Módulo** | M-7 Vocabulario personal |
| **Prioridad** | Alta |
| **Fase** | 4 |
| **Estado** | En progreso |
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

## Verificación (2026-10-19)
- Pantalla `/diccionario` (enlace desde «Mis grupos»); lógica en `lib/domain/dictionary.ts`, vista en `app/diccionario/`.
- Criterio 1 ✅ lista virtualizada: en una build con 2 000 palabras sintéticas, carga en 95–316 ms y dibuja 13 filas (Chromium 360/768/1280; sin desbordamiento, objetivos ≥ 44 px).
- Criterio 2 ✅ pruebas: parcial, sin mayúsculas ni tildes, ß=ss, ä=ae (lema o significado).
- Criterio 3 ✅ pruebas de componente: detalle con todos los significados, oración y enlace `/libros/[id]?pagina=N` (el lector abre en esa página).
- Sin verificar con datos reales de una sesión (la pantalla pide ingreso).
