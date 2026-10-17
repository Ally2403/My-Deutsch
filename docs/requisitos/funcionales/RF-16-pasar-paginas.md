# RF-16 — Pasar páginas

| Campo | Valor |
|---|---|
| **ID** | RF-16 |
| **Título** | Pasar páginas |
| **Módulo** | M-5 Lector |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-14](RF-14-ver-biblioteca-del-grupo.md) |
| **Reglas de negocio** | RN-14 |

## Descripción
El lector muestra una página a la vez (o dos en pantallas anchas horizontales) y permite avanzar o retroceder con deslizamiento, toque en los bordes, flechas del teclado o un selector "ir a página".

## Justificación
El usuario pidió que se lea como un libro normal.

## Criterios de aceptación
1. Deslizar horizontalmente cambia de página sin activar el gesto "atrás" de iOS (zona de 24 px desde el borde reservada).
2. Las flechas ← → y AvPág/RePág cambian de página en computador.
3. El selector permite saltar a cualquier página y muestra "página X de Y".
4. Las páginas siguiente y anterior se precargan para cumplir RNF-02.
