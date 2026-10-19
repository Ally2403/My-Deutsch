# RF-43 — Calidad de las traducciones al español

| Campo                 | Valor                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------- |
| **ID**                | RF-43                                                                                  |
| **Título**            | Calidad de las traducciones al español                                                 |
| **Módulo**            | M-6 Léxico                                                                             |
| **Prioridad**         | Alta                                                                                   |
| **Fase**              | 3                                                                                      |
| **Estado**            | Hecho                                                                                  |
| **Dependencias**      | [RF-21](RF-21-consultar-palabra.md), [RF-12](RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | —                                                                                      |

## Descripción

Las acepciones en español de cada palabra deben ser las que un estudiante B1–C1 espera: primero la traducción corriente de la palabra (_die Hilfe → la ayuda_), y después los demás sentidos. Las definiciones en inglés de Wiktionary se limpian antes de traducirse ("the act of helping" no se traduce literalmente).

## Justificación

La usuaria probó un libro real y varias traducciones eran literales o rebuscadas (_die Hilfe_ salía como «el actor de ayudar, asistencia»). Hoy el 100 % de las acepciones son traducción automática de una definición suelta en inglés.

## Criterios de aceptación

1. En un conjunto de prueba de ≥ 40 palabras del libro de muestra, la primera acepción es una traducción correcta y corriente en ≥ 90 % de los casos (la usuaria revisa las que ofrezcan dudas).
2. Ninguna acepción conserva fórmulas de definición ("acto de…", "persona o cosa que…") cuando existe una alternativa.
3. Sigue funcionando sin red al consultar (RNF-01) y sin costo (plan gratuito); cualquier modelo nuevo se instala con huella SHA-256 verificada.
4. El tiempo de procesamiento de un libro sigue dentro de RNF-04.
5. Las acepciones automáticas siguen marcadas como tales (`m: true`).

## Verificación

2026-10-18/19: Docker (mismo Ubuntu que Actions), libro de muestra `samples/Der Schatz-3-7.pdf` (10 páginas, 693 entradas de léxico), modelos reales Opus-MT. Suite del worker: 248 pruebas.

1. ✅ La usuaria probó el libro de muestra en la app real (2026-10-19) y aprobó las traducciones («me encantan»). Revisión previa de Claude sobre 46 palabras: _Hilfe → ayuda_, _Schatz → tesoro_, _Kommissar → comisario_, _anfangen → empezar_, _ich → yo_; fallan algunas palabras raras (_Lernkrimi_) y _ihr_ (sale «ella»). No se contó formalmente el 90 % palabra por palabra.
2. ✅ 0 de 693 entradas con «acto de», «persona o cosa que», paréntesis, corchetes o comillas (se encontraron y corrigieron 5 defectos al verificar: paréntesis anidados, fórmulas a medias, pronombres pegados a verbos, palabras funcionales y salidas sin letras).
3. ✅ Sin red al consultar (las acepciones viajan en el JSON de la página, sin cambios en el cliente); plan gratuito (modelos Apache-2.0, caché de Actions); los archivos se descargan en una revisión fija, se verifican con SHA-256 y el modelo instalado se vuelve a verificar al cargarse (pruebas de huella alterada, archivo extra o faltante, marcador falsificado y enlace simbólico).
4. ✅ En Actions (runner estándar, 2026-10-19, libro de muestra de 10 páginas, con caché de modelos): «Procesar y publicar» tardó 115 s (11,5 s por página, ≈ 38 min por 200 páginas); instalar los modelos desde la caché, 18 s. La primera ejecución sin caché convierte los modelos (≈ 3–5 min más). RNF-04 con 200 páginas reales sigue pendiente de medir. (Local con Docker: 137 s; antes con Argos ≈ 27 s por página.)
5. ✅ 693 entradas: todas las acepciones automáticas llevan `m: true`; ninguna acepción tiene `m: false` porque el volcado de Wiktionary no trae español.

Resultado en el libro de muestra: 684 de 693 entradas (98,7 %) con al menos una acepción (antes 98,3 %).
Hay que **reprocesar los libros ya subidos** (botón «Reintentar» o subirlos de nuevo) para ver el cambio.

Limitaciones conocidas: una traducción puede ser rara en palabras poco frecuentes o con varios sentidos; las acepciones de las definiciones de Wiktionary mantienen su orden (la primera acepción no siempre es el sentido que aparece en el libro).
