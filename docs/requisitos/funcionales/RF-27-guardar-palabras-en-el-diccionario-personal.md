# RF-27 — Guardar palabras en el diccionario personal

| Campo | Valor |
|---|---|
| **ID** | RF-27 |
| **Título** | Guardar palabras en el diccionario personal |
| **Módulo** | M-7 Vocabulario personal |
| **Prioridad** | Alta |
| **Fase** | 4 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-21](RF-21-consultar-palabra.md) |
| **Reglas de negocio** | RN-05, RN-06 |

## Descripción
Cada consulta guarda o actualiza automáticamente la entrada en el diccionario personal del usuario (lema, tipo, género, significados, contador, primera aparición con oración de contexto y fechas).

## Justificación
La usuaria pidió que las palabras averiguadas se guarden solas.

## Criterios de aceptación
1. Tras consultar una palabra nueva, aparece en el diccionario personal con estado "vista" y contador 1.
2. Consultar de nuevo el mismo lema (en cualquier forma) incrementa el contador y no crea un duplicado.
3. Funciona sin conexión momentánea: la consulta se encola y se sincroniza al volver la red.
