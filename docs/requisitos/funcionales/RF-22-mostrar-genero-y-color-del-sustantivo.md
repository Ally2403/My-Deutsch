# RF-22 — Mostrar género y color del sustantivo

| Campo | Valor |
|---|---|
| **ID** | RF-22 |
| **Título** | Mostrar género y color del sustantivo |
| **Módulo** | M-6 Léxico |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-21](RF-21-consultar-palabra.md) |
| **Reglas de negocio** | RN-01 |

## Descripción
Si la palabra es un sustantivo, el panel muestra el artículo y el plural (p. ej. "das Haus, die Häuser"), con el artículo y el lema coloreados según RN-01.

## Justificación
Memorizar el género con color es la técnica que usa el curso.

## Criterios de aceptación
1. der → azul, das → verde, die → rojo, en tonos que cumplen RNF-09.
2. Los casos de varios géneros y solo plural se muestran como indica RN-01.
3. El color nunca es la única señal: siempre se muestra también el artículo escrito.

## Verificación
Verificado el 2026-10-17 con las 3 páginas sintéticas de `public/demo/` (`/lector/demo`): Playwright en Chromium a 360, 768 y 1280 px contra la build de producción, y WebKit con perfil iPhone 13 emulado en Windows. No se ha probado con un libro real ni en un iPhone físico.

1. ✅ der azul, das verde, die rojo con los tokens `--gender-*`, que cumplen RNF-09 c1.
2. ✅ Varios géneros («der/das Teil» + «varios géneros») y solo plural (gris + «solo plural»); los nombres propios no se colorean.
3. ✅ El artículo se escribe siempre.
