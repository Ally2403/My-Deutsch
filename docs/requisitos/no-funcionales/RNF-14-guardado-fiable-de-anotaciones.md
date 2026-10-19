# RNF-14 — Guardado fiable de anotaciones

| Campo | Valor |
|---|---|
| **ID** | RNF-14 |
| **Título** | Guardado fiable de anotaciones |
| **Módulo** | M-8 Ejercicios |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-33](../funcionales/RF-33-escribir-respuestas-sobre-la-pagina.md) |
| **Reglas de negocio** | — |

## Descripción
Las anotaciones se guardan automáticamente en menos de 1 s después de dejar de escribir y no se pierden al cambiar de página, cerrar la app o perder la conexión.

## Justificación
Perder una respuesta escrita genera desconfianza en la herramienta.

## Criterios de aceptación
1. Escribir, cambiar de página antes de 1 s y volver muestra el texto intacto.
2. Sin conexión, las anotaciones se guardan localmente (IndexedDB) y se sincronizan al reconectar; la prueba E2E en modo offline lo verifica.
