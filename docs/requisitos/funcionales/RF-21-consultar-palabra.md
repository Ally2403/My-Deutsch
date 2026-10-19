# RF-21 — Consultar palabra

| Campo                 | Valor                                                      |
| --------------------- | ---------------------------------------------------------- |
| **ID**                | RF-21                                                      |
| **Título**            | Consultar palabra                                          |
| **Módulo**            | M-6 Léxico                                                 |
| **Prioridad**         | Alta                                                       |
| **Fase**              | 3                                                          |
| **Estado**            | En progreso                                                |
| **Dependencias**      | [RF-17](RF-17-texto-seleccionable-alineado-al-original.md) |
| **Reglas de negocio** | RN-05, RN-06, RN-12                                        |

## Descripción

Al tocar (o hacer clic en) una palabra, se abre un panel con la palabra tal como aparece, su lema, su tipo de palabra y hasta 5 significados en español. En móvil el panel es una hoja inferior; en computador, una tarjeta junto a la palabra.

## Justificación

Es la función central: reduce el tiempo de traducción, que es el mayor cuello de botella al leer.

## Criterios de aceptación

1. El panel aparece en < 300 ms (RNF-01), sin llamadas a servicios externos.
2. Muestra lema, tipo de palabra en español (sustantivo, verbo, adjetivo…), hasta 5 acepciones y la etiqueta "traducción automática" cuando aplique.
3. Para verbos muestra el infinitivo y la forma consultada (p. ej. "ging → gehen, pretérito").
4. Se cierra al tocar fuera, deslizar hacia abajo o presionar Esc, sin cambiar de página.
5. Registra la consulta según RN-05.

## Verificación

Verificado el 2026-10-17 con las 3 páginas sintéticas de `public/demo/` (`/lector/demo`): Playwright en Chromium a 360, 768 y 1280 px contra la build de producción, y WebKit con perfil iPhone 13 emulado en Windows. No se ha probado con un libro real ni en un iPhone físico.

1. ✅ Sin peticiones de red al tocar una palabra; apertura del panel medida en RNF-01.
2. ✅ Lema, tipo de palabra en español, hasta 5 acepciones y «traducción automática».
3. ✅ Formas verbales: «ging → gehen, pretérito».
4. ✅ Esc y tocar fuera cierran el panel sin cambiar de página. Deslizar hacia abajo está cubierto por prueba unitaria, no con un dedo real.
5. ⚠ Parcial: `recordLookup()` entrega la consulta (lema, tipo, página y oración) a un manejador, pero aún no hay conexión con `user_words`; llega con el diccionario personal.

Worker con traducción automática (2026-10-17, 10 páginas reales): 98,3 % de las palabras con entrada de léxico tienen al menos una acepción en español. Todas las acepciones (1 630 en 693 entradas) vienen de Argos y llevan la marca «traducción automática» (desde RF-43/ADR-007 se traducen con Opus-MT y las acepciones son otras; ver RF-43): el volcado de Wiktionary usado no trae traducciones al español. 3,8 % de las entradas quedan sin acepciones (el panel lo avisa). La calidad de la traducción automática no se evaluó con una persona.
