# CU-03 — Unirse a un grupo

**Requisitos:** RF-07

## 1. Descripción corta
Un lector entra a un grupo con un código o un enlace de invitación.

## 2. Actores
- Visitante o Lector

## 3. Precondiciones
- Existe un grupo con un código de invitación vigente.

## 4. Flujo básico de eventos
1. El usuario abre el enlace de invitación.
2. Si no tiene sesión, se ejecuta CU-01 y luego regresa aquí.
3. El sistema muestra el nombre del grupo y el botón "Unirme".
4. El usuario confirma; el sistema crea la membresía con rol de miembro.
5. El sistema abre la biblioteca del grupo.

## 5. Flujos alternos
- **1a. Con código:** el usuario escribe el código en "Unirme a un grupo" y continúa en el paso 3.
- **4a. Ya es miembro:** el sistema abre directamente la biblioteca.

## 6. Postcondiciones
### 6.1 Completado satisfactoriamente
El usuario es miembro y ve los libros del grupo.

### 6.2 Terminado con condición de falla
El usuario no queda en el grupo y se le muestra el motivo.

## 7. Excepciones
- Código no válido o regenerado.
- Grupo lleno (50 miembros).
