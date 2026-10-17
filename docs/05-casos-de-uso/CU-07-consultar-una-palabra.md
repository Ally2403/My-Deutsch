# CU-07 — Consultar una palabra

**Requisitos:** RF-21, RF-22, RF-24, RF-25, RF-27, RF-28

## 1. Descripción corta
El lector toca una palabra para ver su significado y su género; la palabra queda en su diccionario.

## 2. Actores
- Miembro de grupo

## 3. Precondiciones
- Hay una página abierta en el lector (CU-06).

## 4. Flujo básico de eventos
1. El lector toca una palabra.
2. El sistema resalta la palabra y abre el panel con forma, lema, tipo y hasta 5 significados (RN-12).
3. Si es sustantivo, muestra artículo, plural y color (RN-01).
4. El sistema registra la consulta en el diccionario personal (RN-05) y aplica la marca de "vista" en el texto.
5. El lector cierra el panel y continúa leyendo.

## 5. Flujos alternos
- **2a. Verbo separable:** el panel muestra el verbo compuesto y resalta la partícula (RN-07).
- **2b. Palabra ya vista:** el panel indica cuántas veces se ha consultado y dónde apareció por primera vez.
- **2c. Palabra no encontrada:** se aplica RF-25.
- **4a. Marcar como conocida:** el lector toca "Ya la conozco" (RF-29).

## 6. Postcondiciones
### 6.1 Completado satisfactoriamente
La consulta queda registrada en el diccionario personal.

### 6.2 Terminado con condición de falla
Se muestra el panel, pero la consulta queda pendiente en la cola offline hasta poder sincronizarse.

## 7. Excepciones
- Sin conexión: el panel funciona igual (los datos vienen en la página) y el registro se sincroniza después.
