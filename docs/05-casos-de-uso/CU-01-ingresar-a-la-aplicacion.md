# CU-01 — Ingresar a la aplicación

**Requisitos:** RF-01, RF-02, RF-03, RF-04

## 1. Descripción corta
El visitante crea una cuenta o inicia sesión con correo y contraseña o con Google.

## 2. Actores
- Visitante

## 3. Precondiciones
- El visitante no tiene una sesión activa.

## 4. Flujo básico de eventos
1. El visitante abre la aplicación y el sistema muestra la pantalla de ingreso.
2. El visitante elige "Continuar con Google".
3. El sistema redirige a Google; el visitante elige su cuenta y acepta.
4. Google regresa a la aplicación; el sistema crea el perfil si es el primer ingreso.
5. El sistema abre el destino pendiente (p. ej. una invitación) o "Mis grupos".

## 5. Flujos alternos
- **2a. Registro con correo:** el visitante elige "Crear cuenta", ingresa nombre, correo y contraseña; el sistema valida (RF-01), envía el correo de verificación y, al confirmarlo, continúa en el paso 5.
- **2b. Ingreso con correo:** el visitante ingresa correo y contraseña; si son válidos, continúa en el paso 5.
- **2c. Olvidó su contraseña:** el visitante solicita el enlace (RF-04), define una contraseña nueva y continúa en el paso 5.

## 6. Postcondiciones
### 6.1 Completado satisfactoriamente
El usuario tiene una sesión activa y un perfil creado.

### 6.2 Terminado con condición de falla
El usuario sigue sin sesión y se muestra el motivo.

## 7. Excepciones
- Credenciales inválidas: "Correo o contraseña incorrectos".
- El visitante cancela en Google: vuelve a la pantalla de ingreso sin error.
- Demasiados intentos: se muestra cuánto debe esperar.
