# CU-04 — Subir un libro

**Requisitos:** RF-11, RF-13

## 1. Descripción corta
Un miembro sube el PDF escaneado del libro del curso a su grupo.

## 2. Actores
- Miembro de grupo

## 3. Precondiciones
- El usuario es miembro del grupo.
- No tiene otro libro en procesamiento (RN-10).

## 4. Flujo básico de eventos
1. El miembro abre la biblioteca del grupo y elige "Subir libro".
2. Selecciona el PDF y escribe el título.
3. El sistema valida el tipo, el tamaño y el número de páginas (RNF-11) y calcula la huella SHA-256 en el navegador.
4. El sistema consulta si la huella ya existe (RN-02); como no existe, sube el PDF con barra de progreso.
5. El sistema crea el libro y el trabajo en estado "En cola" y dispara el procesamiento (CU-05).
6. La biblioteca muestra el libro con su avance en tiempo real.

## 5. Flujos alternos
- **4a. Libro ya procesado:** el sistema vincula el libro existente al grupo sin subirlo de nuevo y lo muestra como "Listo".
- **4b. Conexión interrumpida:** la subida se reanuda desde donde quedó al volver la red.

## 6. Postcondiciones
### 6.1 Completado satisfactoriamente
El libro aparece en la biblioteca del grupo, en cola o listo.

### 6.2 Terminado con condición de falla
No se crea el libro; el PDF parcial se descarta.

## 7. Excepciones
- Archivo que no es PDF o que supera los límites: mensaje con el límite.
- Ya tiene un libro en procesamiento: "Espera a que termine tu libro actual".
