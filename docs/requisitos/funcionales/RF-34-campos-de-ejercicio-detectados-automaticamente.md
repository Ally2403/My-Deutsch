# RF-34 — Campos de ejercicio detectados automáticamente

| Campo | Valor |
|---|---|
| **ID** | RF-34 |
| **Título** | Campos de ejercicio detectados automáticamente |
| **Módulo** | M-8 Ejercicios |
| **Prioridad** | Baja |
| **Fase** | 4 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-33](RF-33-escribir-respuestas-sobre-la-pagina.md), [RF-12](RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | RN-13 |

## Descripción
Durante el procesamiento se detectan los espacios para completar (líneas "____", huecos en tablas) y se ofrecen como campos de texto ya ubicados, que el usuario llena con un toque.

## Justificación
Acelera la resolución de ejercicios de completar, que son los más comunes.

## Criterios de aceptación
1. En las 5 páginas de ejercicios del conjunto de prueba, ≥ 70 % de los espacios de completar se detectan como campos.
2. Un campo mal detectado se puede ocultar, y siempre queda disponible el modo libre de RF-33.
