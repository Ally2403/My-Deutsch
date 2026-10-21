# RF-53 — Aviso al terminar la subida de un libro

| Campo                 | Valor                                           |
| --------------------- | ----------------------------------------------- |
| **ID**                | RF-53                                           |
| **Título**            | Aviso al terminar la subida de un libro         |
| **Módulo**            | M-3 Libros                                      |
| **Prioridad**         | Media                                           |
| **Fase**              | 6                                               |
| **Estado**            | En progreso                                     |
| **Dependencias**      | [RF-11](RF-11-subir-pdf-escaneado-a-un-grupo.md) |
| **Reglas de negocio** | RN-10                                           |

## Descripción

Al terminar de subir un PDF, la app dice con claridad que el libro quedó en cola y se está procesando, y la lista de libros del grupo se actualiza sola.

## Justificación

Pedido de la usuaria (2026-10-21): tras subir un libro en la vista previa no apareció ningún aviso y tuvo que recargar para ver el libro en la lista.

## Criterios de aceptación

1. Cuando el servidor acepta la subida, el formulario muestra «Libro subido. Se está procesando…» (región `role="status"`), además del aviso de libro reutilizado cuando corresponde.
2. La lista de libros del grupo se refresca sin recargar la página.
3. Si algo falla, sigue saliendo el mensaje de error de siempre.

## Aprobación

Aprobado por la usuaria, 2026-10-21 («sí» a la propuesta).

## Verificación

Criterio 1: prueba unitaria. Criterios 2 y 3: no se pudo verificar el refresco en el navegador (ver `docs/ESTADO.md`).
