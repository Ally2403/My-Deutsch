# RF-20 — Recordar última página

| Campo | Valor |
|---|---|
| **ID** | RF-20 |
| **Título** | Recordar última página |
| **Módulo** | M-5 Lector |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-16](RF-16-pasar-paginas.md) |
| **Reglas de negocio** | RN-14 |

## Descripción
El sistema guarda automáticamente la última página abierta por el usuario en cada libro y la usa al reabrirlo, en cualquier dispositivo.

## Justificación
Los estudiantes leen en el celular y luego continúan en el computador.

## Criterios de aceptación
1. Al reabrir el libro en otro dispositivo, se abre en la última página guardada (con un retraso máximo de 5 s entre dispositivos).
