# CU-02 — Crear grupo e invitar compañeros

**Requisitos:** RF-06, RF-08, RF-09

## 1. Descripción corta
Un lector crea un grupo para su curso y comparte la invitación.

## 2. Actores
- Lector (pasa a ser Administrador de grupo)

## 3. Precondiciones
- El lector tiene una sesión activa.

## 4. Flujo básico de eventos
1. El lector abre "Mis grupos" y elige "Crear grupo".
2. Ingresa el nombre del grupo y confirma.
3. El sistema crea el grupo, registra al lector como administrador y genera el código de invitación (RN-09).
4. El sistema muestra el código y el botón "Compartir enlace".
5. El lector comparte el enlace (hoja de compartir nativa o copiar).

## 5. Flujos alternos
- **5a. Regenerar código:** el administrador regenera el código; el anterior deja de funcionar.

## 6. Postcondiciones
### 6.1 Completado satisfactoriamente
El grupo existe con su administrador y un código de invitación válido.

### 6.2 Terminado con condición de falla
No se crea el grupo; el formulario muestra el error.

## 7. Excepciones
- Nombre fuera de 3–60 caracteres: error de validación.
