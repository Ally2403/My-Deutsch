# CU-08 — Revisar mi diccionario personal

**Requisitos:** RF-30, RF-31, RF-29, RF-32

## 1. Descripción corta
El lector repasa, busca y filtra las palabras que ha consultado.

## 2. Actores
- Lector

## 3. Precondiciones
- El lector tiene una sesión activa.

## 4. Flujo básico de eventos
1. El lector abre "Mi diccionario".
2. El sistema lista sus palabras, ordenadas por fecha, con el artículo coloreado.
3. El lector filtra por tipo, género, estado o libro; el sistema actualiza la lista y los contadores.
4. El lector toca una palabra y ve todos sus significados y la oración de origen.
5. El lector toca "Ver en el libro" y el sistema abre esa página (CU-06).

## 5. Flujos alternos
- **3a. Búsqueda por texto** en alemán o en español.
- **4a. Cambiar estado o eliminar** la palabra.
- **5a. Exportar** la lista filtrada a CSV.

## 6. Postcondiciones
### 6.1 Completado satisfactoriamente
El lector vio o actualizó su vocabulario.

### 6.2 Terminado con condición de falla
Se muestra un error y la lista anterior se conserva.

## 7. Excepciones
- El diccionario está vacío: se muestra una guía para empezar a leer.
