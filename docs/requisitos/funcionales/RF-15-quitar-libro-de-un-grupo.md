# RF-15 — Quitar libro de un grupo

| Campo | Valor |
|---|---|
| **ID** | RF-15 |
| **Título** | Quitar libro de un grupo |
| **Módulo** | M-3 Biblioteca |
| **Prioridad** | Baja |
| **Fase** | 4 |
| **Estado** | Hecho |
| **Dependencias** | [RF-14](RF-14-ver-biblioteca-del-grupo.md) |
| **Reglas de negocio** | RN-08, RN-11 |

## Descripción
Quien subió el libro, o un administrador, puede quitarlo del grupo. Se aplica la regla de eliminación diferida RN-11.

## Justificación
Corrige errores de subida y libera espacio del plan gratuito.

## Criterios de aceptación
1. Tras confirmar, el libro deja de aparecer en el grupo.
2. Si no queda vinculado a ningún grupo, sus archivos se eliminan pasados 7 días, y las palabras del diccionario personal se conservan.

## Verificación (2026-10-19)
- Criterio 1 ✅ «Quitar del grupo» en la tarjeta (solo administrador o quien lo agregó, RN-08) con confirmación; borra el vínculo `group_books` de ese grupo y refresca la lista (pruebas de componente: no borra al cancelar, avisa si RLS no borra nada). En la base real (rollback): un miembro que no lo agregó borra 0 filas; el administrador, 1.
- Criterio 2 ✅ al quedar sin grupos el disparador `touch_book_retention` fija `delete_after` a +7 días (verificado en la base real, rollback) y el flujo diario `.github/workflows/mantenimiento.yml` (`python -m maintenance`) elimina la fila (cascada: páginas, trabajos, anotaciones) y luego `pages/<id>/…`. Se omite un libro que se volvió a vincular. El diccionario personal conserva sus lemas (`first_book_id` pasa a nulo). Pruebas con transporte simulado (3).
- Sin verificar: una ejecución real del workflow (disparable con «Run workflow»); el flujo diario también sirve de actividad contra la pausa de Supabase.
