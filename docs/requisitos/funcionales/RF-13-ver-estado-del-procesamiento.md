# RF-13 — Ver estado del procesamiento

| Campo | Valor |
|---|---|
| **ID** | RF-13 |
| **Título** | Ver estado del procesamiento |
| **Módulo** | M-3 Biblioteca |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-12](RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | — |

## Descripción
La biblioteca muestra el estado de cada libro (En cola, Procesando X/Y páginas, Listo, Error) y se actualiza sin recargar la página.

## Justificación
Procesar un libro tarda minutos; el usuario necesita saber que avanza.

## Criterios de aceptación
1. Durante el procesamiento se muestra el avance en páginas, actualizado al menos cada 30 segundos.
2. Mientras se procesa, se pueden abrir las páginas ya listas.
3. Si falla, se muestra "Error" con el motivo resumido y un botón "Reintentar" para quien lo subió o para el administrador.
