# RNF-01 — Tiempo de respuesta al consultar una palabra

| Campo | Valor |
|---|---|
| **ID** | RNF-01 |
| **Título** | Tiempo de respuesta al consultar una palabra |
| **Módulo** | M-6 Léxico |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-21](../funcionales/RF-21-consultar-palabra.md) |
| **Reglas de negocio** | — |

## Descripción
Desde que el usuario toca una palabra hasta que el panel muestra sus significados transcurren menos de 300 ms en el percentil 95, en un celular de gama media con 4G.

## Justificación
Si la consulta es lenta, el usuario pierde el hilo de la lectura y la ventaja frente a un diccionario externo desaparece.

## Criterios de aceptación
1. Medición con Playwright (perfil Moto G4 + 4G rápido) sobre 100 toques en un libro real: p95 < 300 ms.
2. Las entradas de léxico de la página se descargan junto con la página, por lo que tocar una palabra no hace peticiones de red.
