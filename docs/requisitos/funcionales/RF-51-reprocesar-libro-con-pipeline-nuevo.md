# RF-51 — Reprocesar un libro con el pipeline nuevo

| Campo                 | Valor                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **ID**                | RF-51                                                                                                      |
| **Título**            | Reprocesar un libro con el pipeline nuevo                                                                  |
| **Módulo**            | M-4 Procesamiento (worker)                                                                                 |
| **Prioridad**         | Alta                                                                                                       |
| **Fase**              | 6                                                                                                          |
| **Estado**            | Propuesto (sin aprobar)                                                                                    |
| **Dependencias**      | [RF-11](RF-11-subir-pdf-escaneado-a-un-grupo.md), [RF-12](RF-12-procesar-libro-en-segundo-plano.md), RF-47 |
| **Reglas de negocio** | RN-02, RN-14                                                                                               |

## Descripción

Si se sube un PDF cuya huella ya existe pero el libro fue procesado con una versión anterior del pipeline, el sistema lo **reprocesa conservando el mismo `book_id`** (y con él el progreso, las anotaciones y los grupos), en lugar de solo reutilizarlo. Si la versión es la actual, se reutiliza como hoy y la pantalla avisa «Este libro ya estaba en la biblioteca».

## Justificación

Propuesto por Claude (2026-10-21) tras el caso de la usuaria: quitó un libro del grupo y lo volvió a subir, pero RN-02 lo vinculó al libro viejo (quitarlo de un grupo no borra el libro) y no recibió `sents`, campos ni ilustraciones. El PDF se borra al terminar, así que la nueva subida es la única oportunidad de reprocesar.

## Criterios de aceptación (propuestos)

1. `books.pipeline_version` (entero, por omisión 1); el worker escribe la versión vigente al terminar.
2. `finalize_submission` con huella existente y versión menor: el libro pasa a `processing`, se crea un `job` y se despacha el worker; `book_id`, `pages_read` y anotaciones no cambian.
3. Con versión vigente: se reutiliza y la interfaz muestra el aviso de libro existente.
4. El reprocesado no deja el libro inutilizable: las páginas viejas se siguen sirviendo hasta publicar las nuevas.
5. Migración aditiva con RLS intacta y prueba pgTAP; pruebas del worker y de la interfaz.

## Aprobación

Propuesto por Claude, sin aprobar. No se implementa hasta que la usuaria lo apruebe.

## Verificación

Pendiente.
