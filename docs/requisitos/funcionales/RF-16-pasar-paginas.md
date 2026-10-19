# RF-16 — Pasar páginas

| Campo | Valor |
|---|---|
| **ID** | RF-16 |
| **Título** | Pasar páginas |
| **Módulo** | M-5 Lector |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
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

## Verificación
Verificado el 2026-10-17 con las 3 páginas sintéticas de `public/demo/` (`/lector/demo`): Playwright en Chromium a 360, 768 y 1280 px contra la build de producción, y WebKit con perfil iPhone 13 emulado en Windows. No se ha probado con un libro real ni en un iPhone físico.

1. ⚠ Parcial: con eventos de puntero táctiles sintéticos, un gesto que empieza a menos de 24 px del borde se ignora y uno desde 200 px cambia de página. No probado con el gesto real de iOS.
2. ✅ Flechas y AvPág/RePág cambian de página.
3. ✅ El selector salta a cualquier página, muestra «página X de Y» y rechaza valores fuera de rango.
4. ✅ Pruebas unitarias: se precargan la página siguiente y la anterior (JSON e imagen). No se midió el efecto sobre RNF-02.
Pendiente: la vista de dos páginas en pantallas anchas (opcional en la descripción) no está implementada.

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
- Limitación conocida: el gesto de deslizar se probó con eventos sintéticos y con el iPhone de la usuaria, sin medición automática en iOS real.
