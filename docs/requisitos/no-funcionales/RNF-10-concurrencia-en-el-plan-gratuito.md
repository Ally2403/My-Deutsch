# RNF-10 — Concurrencia en el plan gratuito

| Campo | Valor |
|---|---|
| **ID** | RNF-10 |
| **Título** | Concurrencia en el plan gratuito |
| **Módulo** | M-T Transversal |
| **Prioridad** | Media |
| **Fase** | 5 |
| **Estado** | En progreso |
| **Dependencias** | — |
| **Reglas de negocio** | — |

## Descripción
El sistema atiende a 25 usuarios leyendo simultáneamente sin degradarse y sin superar los límites del plan gratuito.

## Justificación
Es el tamaño del curso, que suele leer a la vez en clase.

## Criterios de aceptación
1. Con una prueba de carga k6 de 25 usuarios virtuales pasando página y consultando palabras durante 10 minutos, el 95 % de las peticiones a la API responde en < 500 ms y no hay errores 5xx.
2. El consumo mensual estimado se mantiene por debajo del 80 % de las cuotas gratuitas de Vercel, Supabase y Actions (ver docs/03, sección Presupuesto).
