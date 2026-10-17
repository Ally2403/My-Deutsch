# 01 · Actores del sistema

Todos los actores humanos son estudiantes del curso de alemán. **Miembro** y **Administrador de grupo** son especializaciones de **Lector**: una misma persona puede ser administradora de un grupo y miembro de otro. El **worker de procesamiento** no se modela como actor porque es un componente interno; se activa cuando un lector sube un libro.

| Actor | Descripción | Responsabilidades |
|---|---|---|
| **Visitante** | Persona sin sesión iniciada. | Registrarse con correo y contraseña o con Google; iniciar sesión; abrir un enlace de invitación (se le pide iniciar sesión antes de unirse). |
| **Lector** (actor principal) | Usuario autenticado. | Gestionar su perfil; crear grupos o unirse a ellos; leer libros de sus grupos; consultar palabras; gestionar su diccionario personal; escribir respuestas en ejercicios. |
| **Miembro de grupo** | Lector que pertenece a un grupo. | Ver la biblioteca del grupo; subir libros al grupo; leer con su progreso individual; salir del grupo. |
| **Administrador de grupo** | Lector que creó el grupo o recibió el rol. | Todo lo del miembro, más: compartir y regenerar el código de invitación, expulsar miembros, eliminar cualquier libro del grupo, renombrar o eliminar el grupo. **No** puede ver el vocabulario, el progreso ni las respuestas de los miembros (RN-04). |

```mermaid
flowchart LR
  V[Visitante] -->|se registra| L[Lector]
  L --> M[Miembro de grupo]
  M --> A[Administrador de grupo]
```
