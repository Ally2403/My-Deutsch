# RF-25 — Palabra no encontrada

| Campo | Valor |
|---|---|
| **ID** | RF-25 |
| **Título** | Palabra no encontrada |
| **Módulo** | M-6 Léxico |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-21](RF-21-consultar-palabra.md) |
| **Reglas de negocio** | RN-12 |

## Descripción
Si la palabra no tiene entrada en el léxico (nombre propio, error de OCR o palabra rara), el panel lo indica, muestra la forma reconocida y ofrece enlaces para buscarla externamente.

## Justificación
Es mejor decir "no sé" que mostrar un significado incorrecto.

## Criterios de aceptación
1. El panel muestra "No encontramos esta palabra", la forma reconocida y enlaces a Wiktionary y a DWDS, que se abren en una pestaña nueva.
2. Permite editar la forma (corregir un error de OCR) y buscar de nuevo.
