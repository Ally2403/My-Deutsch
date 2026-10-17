# CU-06 — Leer un libro

**Requisitos:** RF-14, RF-16, RF-17, RF-18, RF-19, RF-20, RF-26

## 1. Descripción corta
El lector abre un libro, pasa páginas y ajusta la vista.

## 2. Actores
- Miembro de grupo

## 3. Precondiciones
- El libro está "Listo" o tiene páginas publicadas.
- El usuario es miembro de un grupo vinculado al libro.

## 4. Flujo básico de eventos
1. El lector toca el libro en la biblioteca.
2. El sistema abre la última página guardada (RN-14) y precarga las páginas vecinas.
3. El lector desliza para pasar página; el sistema muestra la página y guarda el progreso.
4. El lector activa "Colorear sustantivos"; el sistema resalta los sustantivos con su color (RN-01).
5. El lector cierra el libro.

## 5. Flujos alternos
- **3a. Ir a una página:** el lector usa el selector "ir a página".
- **3b. Zoom:** el lector pellizca para ampliar; mientras hay zoom, deslizar mueve la página en lugar de cambiarla.
- **3c. Modo lectura:** el lector cambia al texto ajustado a la pantalla.

## 6. Postcondiciones
### 6.1 Completado satisfactoriamente
El progreso de lectura queda guardado.

### 6.2 Terminado con condición de falla
Se muestra un aviso y la página permanece en la última posición válida.

## 7. Excepciones
- Sin conexión y página no almacenada en caché: "Esta página no está disponible sin conexión".
