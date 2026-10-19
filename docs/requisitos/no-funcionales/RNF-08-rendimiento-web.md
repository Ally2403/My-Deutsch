# RNF-08 — Rendimiento web

| Campo | Valor |
|---|---|
| **ID** | RNF-08 |
| **Título** | Rendimiento web |
| **Módulo** | M-T Transversal |
| **Prioridad** | Media |
| **Fase** | 5 |
| **Estado** | En progreso |
| **Dependencias** | — |
| **Reglas de negocio** | — |

## Descripción
La aplicación obtiene en Lighthouse móvil al menos 85 en rendimiento y 90 en accesibilidad y buenas prácticas en las pantallas de inicio, biblioteca, lector y diccionario.

## Justificación
Una carga inicial lenta en datos móviles desanima el uso diario.

## Criterios de aceptación
1. El informe de Lighthouse CI en cada despliegue de producción cumple los umbrales; si no, el despliegue se marca como fallido.
