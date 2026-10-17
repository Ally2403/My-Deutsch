# 00 · Visión y alcance — My-Deutsch

## 1. Contexto del problema

**Nombre del proyecto:** My-Deutsch

**Descripción.** My-Deutsch es una aplicación web responsive para estudiantes de alemán que convierte un libro escaneado en PDF en un **libro digital interactivo**. Cada página se muestra tal como es en el original (ilustraciones, tablas, tipografía y ejercicios), pero con una capa de texto alineada que hace cada palabra **seleccionable y tocable**. Al tocar una palabra, el sistema muestra su forma base (lema), su tipo de palabra y sus significados principales en español. Si es un sustantivo, muestra su artículo con el **color de género** que se usa en clase: **der = azul, das = verde, die = rojo**. Un interruptor permite colorear todos los sustantivos del libro.

Cada estudiante tiene su cuenta (Google o correo y contraseña) y un **diccionario personal** que se llena solo a medida que consulta palabras. Las palabras ya consultadas aparecen marcadas en el texto la próxima vez que se encuentran, y el diccionario se puede filtrar por tipo de palabra, género, libro y estado. Los libros se comparten mediante **grupos de curso**: el libro se sube y se procesa **una sola vez**, y todos los miembros lo leen con su progreso individual y privado. Para los ejercicios de escritura, cada estudiante puede escribir sus respuestas directamente sobre la página.

## 2. Alcance de la solución

**Objetivo general.** Desarrollar una aplicación web responsive que transforme libros de alemán escaneados en libros interactivos con traducción por palabra, codificación de género por color y vocabulario personal, compartibles por grupos de curso con progreso individual.

**Objetivos específicos.**
1. Implementar un pipeline de procesamiento (OCR + análisis lingüístico) que convierta cada página escaneada en una imagen fiel al original más una capa de palabras con coordenadas, lema, tipo de palabra y género.
2. Construir un lector que permita pasar páginas como en un libro, con texto seleccionable alineado al original y un modo de lectura adaptado a pantallas pequeñas.
3. Implementar la consulta instantánea de palabras con significados en español y colores de género, incluyendo formas conjugadas, declinadas y verbos separables.
4. Implementar un diccionario personal automático con indicadores de "palabra ya vista" en el texto y filtros por tipo, género, libro y estado.
5. Implementar grupos de curso que compartan libros procesados una sola vez, manteniendo privados el progreso, el vocabulario y las respuestas de cada miembro.
6. Permitir responder los ejercicios de escritura del libro directamente sobre la página.

## 3. Supuestos
- Los libros son de **una sola columna**, sin audio, escaneados con calidad legible (≥ 200 DPI recomendado); pueden contener ilustraciones, tablas y ejercicios de completar.
- Los estudiantes tienen nivel aproximado **B1**, pero los libros pueden contener vocabulario hasta **C1**.
- Los PDF son material del curso; los suben los propios estudiantes para uso de estudio dentro de su grupo.
- Se usa principalmente desde **celulares (incluidos iPhone), tablets y computadores**.
- El curso tiene alrededor de 20–25 personas; el sistema no necesita escalar a miles de usuarios en esta versión.

## 4. Restricciones
- **Costo cero:** solo servicios con plan gratuito (Vercel Hobby, Supabase Free, GitHub Actions, herramientas open source). Límites relevantes: base de datos 500 MB, almacenamiento de archivos 1 GB (≈ 25–30 libros de 200 páginas en WebP), 2 000 min/mes de Actions en repositorio privado.
- **Diccionario offline:** los significados provienen de Wiktionary (datos abiertos de kaikki.org); no se usan APIs pagas de traducción ni de IA.
- **Significados en español.** Cuando Wiktionary no tiene traducción directa al español, se usa traducción automática offline de la glosa en inglés (Argos Translate) y se marca como tal.
- Solo idioma fuente **alemán**.
- La aplicación es web (PWA instalable); no hay apps nativas en tiendas.
- Esta versión **no incluye**: corrección automática de ejercicios, audio/pronunciación, repetición espaciada o flashcards, chat entre miembros, analítica para el docente, ni libros públicos. Se consideran trabajo futuro.

## 5. Justificación
En los niveles B1–C1, la lectura de un libro de curso se vuelve lenta porque cada párrafo contiene varias palabras desconocidas: el estudiante tiene que salir del libro, buscar en un diccionario, deducir la forma base de una palabra conjugada y recordar el género del sustantivo. My-Deutsch elimina ese ciclo: la consulta ocurre **en el mismo lugar de la palabra**, con la forma base ya resuelta y el género codificado por color, y lo aprendido queda guardado para reconocerlo después.

El proyecto va más allá de un CRUD: integra un pipeline de OCR con alineación espacial, análisis morfológico (lematización y verbos separables), un modelo de contenido compartido con datos personales aislados por usuario, y una interfaz táctil exigente en móviles.

## 6. Reglas de negocio
Ver [02-reglas-de-negocio.md](02-reglas-de-negocio.md).

## 7. Equipo
| Nombre | Rol |
|---|---|
| Allison Ruiz Romero | Product owner, arquitecta y desarrolladora |
| Claude (asistente) | Análisis, diseño e implementación asistida |
| Compañeros del curso | Usuarios piloto y validación |
