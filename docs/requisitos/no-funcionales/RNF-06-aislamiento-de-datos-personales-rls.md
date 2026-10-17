# RNF-06 — Aislamiento de datos personales (RLS)

| Campo | Valor |
|---|---|
| **ID** | RNF-06 |
| **Título** | Aislamiento de datos personales (RLS) |
| **Módulo** | M-T Transversal |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-27](../funcionales/RF-27-guardar-palabras-en-el-diccionario-personal.md), [RF-33](../funcionales/RF-33-escribir-respuestas-sobre-la-pagina.md), [RF-20](../funcionales/RF-20-recordar-ultima-pagina.md) |
| **Reglas de negocio** | — |

## Descripción
Toda tabla con datos de usuario tiene Row Level Security activada, con políticas que solo permiten leer y escribir filas cuyo user_id coincida con el usuario autenticado. Los libros y sus páginas solo son legibles para miembros de grupos vinculados.

## Justificación
Implementa RN-03 y RN-04 en la base de datos, no solo en la interfaz.

## Criterios de aceptación
1. Prueba automatizada: autenticado como el usuario A, consultar user_words, reading_progress o annotations del usuario B devuelve 0 filas.
2. Prueba automatizada: un usuario que no es miembro no puede descargar imágenes ni tokens de un libro (403 en Storage).
3. El hook post-edit alerta sobre cualquier migración con una tabla sin RLS.
