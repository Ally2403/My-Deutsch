# CU-09 — Responder un ejercicio en la página

**Requisitos:** RF-33, RF-34, RF-35

## 1. Descripción corta
El lector escribe sus respuestas directamente sobre un ejercicio del libro.

## 2. Actores
- Miembro de grupo

## 3. Precondiciones
- Hay una página abierta en el lector.

## 4. Flujo básico de eventos
1. El lector activa el modo "Escribir".
2. Toca el lugar del ejercicio donde va la respuesta.
3. El sistema crea un cuadro de texto en esa posición; el lector escribe.
4. El sistema guarda automáticamente (RNF-14).
5. El lector sale del modo "Escribir"; las respuestas siguen visibles sobre la página.

## 5. Flujos alternos
- **2a. Campo detectado:** el lector toca un campo preubicado (RF-34) y escribe directamente.
- **3a. Mover o borrar** un cuadro existente.
- **5a. Reiniciar** las respuestas de la página (RF-35).

## 6. Postcondiciones
### 6.1 Completado satisfactoriamente
Las respuestas quedan guardadas en privado y se ven en todos los dispositivos del lector.

### 6.2 Terminado con condición de falla
Las respuestas permanecen en el dispositivo y se sincronizan al volver la conexión.

## 7. Excepciones
- Sin conexión: el guardado es local y se sincroniza después.
