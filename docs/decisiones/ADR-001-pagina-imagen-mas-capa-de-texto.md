# ADR-001 · Página = imagen original + capa de texto invisible

**Estado:** Aceptada · **Requisitos:** RF-17, RF-18, RF-26, RF-33

## Contexto
Se pide que el libro "mantenga la forma y el estilo del original" y que el texto sea seleccionable. Los libros traen ilustraciones, tablas y ejercicios.

## Decisión
Mostrar cada página como su imagen escaneada (WebP) y superponer, con posicionamiento absoluto en coordenadas relativas, un `<span>` transparente por palabra obtenido del OCR (el mismo principio que un PDF "searchable"). El coloreo de sustantivos, las marcas de "vista" y las anotaciones son capas adicionales sobre la misma geometría. El modo lectura (RF-18) se construye con los mismos tokens agrupados por párrafo.

## Alternativas descartadas
- **Reconstruir la maquetación en HTML** (fuentes, columnas, imágenes recortadas): pierde fidelidad, es frágil y es muy costosa de construir.
- **Mostrar el PDF con pdf.js y su capa de texto**: obliga a generar un PDF con texto (OCRmyPDF), pesa más en móvil y no deja adjuntar metadatos (lema, género) por palabra.

## Consecuencias
Fidelidad visual total y costo bajo. En celulares pequeños la página completa se lee mal, lo que se mitiga con el zoom y el modo lectura.
