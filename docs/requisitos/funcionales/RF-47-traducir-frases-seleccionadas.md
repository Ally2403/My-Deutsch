# RF-47 — Traducir frases seleccionadas

| Campo                 | Valor                                                                              |
| --------------------- | ---------------------------------------------------------------------------------- |
| **ID**                | RF-47                                                                              |
| **Título**            | Traducir frases seleccionadas                                                      |
| **Módulo**            | M-5 Lector                                                                         |
| **Prioridad**         | Alta                                                                               |
| **Fase**              | 6                                                                                  |
| **Estado**            | En progreso                                                                        |
| **Dependencias**      | [RF-21](RF-21-consultar-palabra.md), [RF-43](RF-43-calidad-de-las-traducciones.md) |
| **Reglas de negocio** | —                                                                                  |

## Descripción

Arrastrando con el mouse (o con el modo «Frase» de dos toques en celular y tableta, o la tecla T sobre una palabra enfocada) se abre un panel con la traducción de la(s) oración(es) que cubre la selección y las glosas de sus palabras. Sin red: la traducción por oración viene precalculada (Opus-MT) en el campo opcional `sents` del JSON de página.

## Justificación

Entender frases completas con su contexto. Decisión autónoma: no se traduce «exactamente lo seleccionado» porque exigiría un servicio externo (costo cero y sin enviar texto a terceros). Corrección 2026-10-21: la oración que contiene un trozo ya no se muestra por defecto (criterio 6); se ofrece aparte.

## Criterios de aceptación

1. El JSON de página v1 admite `sents` opcional (rangos de tokens sin solaparse, `es` ≤ 600 caracteres, ≤ 80 por página, ≤ 3 KB por página); las páginas sin `sents` siguen siendo válidas.
2. Selección con mouse, modo «Frase» (dos toques) y tecla T abren el panel; una sola palabra no abre el de frase; en modo «Escribir» no se abre.
3. El panel muestra el texto, la traducción de cada oración cubierta (con el aviso de traducción automática), glosas con género en color y artículo (RNF-09) y botón «Copiar».
4. Libro antiguo sin `sents`: solo glosas y el aviso «Sube de nuevo el libro para traducir oraciones completas.»
5. Ninguna petición de red al abrir el panel (RNF-01); `role="dialog"`, Esc cierra, axe sin violaciones; 360/768/1280 y WebKit iPhone.
6. (2026-10-21, pedido de la usuaria) El panel no traduce más allá de lo seleccionado: la traducción de una oración se muestra sola solo si la selección la contiene entera; si se eligió un trozo, se muestran el texto elegido y las glosas, y la oración completa queda detrás del botón «Ver la oración completa».

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-20. Plan: [`superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md`](../../superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md).

## Verificación

2026-10-20 (rama `feat/RF-47-traducir-frases`):

- Criterio 1: cumplido en pruebas (`worker/tests/test_page_json.py`, `lib/domain/page.test.ts`: rangos solapados, desordenados o fuera de los tokens, `es` > 600, > 80 oraciones; página sin `sents` válida; una página sintética de 360 tokens suma <= 3 KB). El worker lo escribe en un solo lote por página (`from_german_many`, tope 3 000 bytes de `sents`). Fixtures `public/demo/page-1.json` y `page-2.json` con `sents` escritos a mano.
- Criterio 2: cumplido. Mouse a 1280 (arrastre sobre dos líneas de la demo), modo «Frase» con dos toques en 360, 768, 1280 y WebKit iPhone, «Traducir la oración» desde el panel de palabra y tecla T (`e2e/frases.spec.ts`). Una sola palabra no abre el panel (`lib/domain/phrase.test.ts`, `use-phrase-selection.test.tsx`). **No se pudo verificar en el navegador** que el modo «Escribir» no abre el panel (la demo no tiene capa de respuestas); solo hay prueba unitaria de `enabled=false` y `PageReader` pasa `!writeMode`.
- Criterio 3: cumplido (`phrase-panel.test.tsx` y e2e: texto, traducción por oración con el aviso de traducción automática, artículo der/die en color y escrito, botón «Copiar»).
- Criterio 4: cumplido en pruebas (`phrase-panel.test.tsx`: sin `sents` solo glosas y el aviso).
- Criterio 5: cumplido con la demo: cero peticiones al abrir el panel (e2e), `role="dialog"`, Esc cierra, axe sin violaciones serias y sin desborde horizontal en 360, 768, 1280 y WebKit iPhone. **No se pudo verificar:** el arrastre con mouse en WebKit de escritorio, y en un iPhone físico el modo «Frase».
- **No se pudo verificar:** la traducción real de oraciones con Opus-MT en un libro (el modelo no está instalado en este equipo; `pytest` de `test_opus` falla localmente por eso) ni el costo de tiempo por página (objetivo <= +20 %, `worker/tools/bench.py`). Es una sola llamada por lote por página, con `max_decoding_length` 256.
- **Los libros ya subidos deben subirse de nuevo** para tener `sents` (el PDF se borra al terminar el procesamiento); mientras tanto el panel muestra las glosas y el aviso «Sube de nuevo el libro para traducir oraciones completas.».
- Decisiones autónomas: la traducción es de la oración que contiene la selección (no del fragmento exacto); `sents` omite oraciones sin letras y se corta al llegar a 3 000 bytes; el arrastre con mouse solo se detecta sobre la capa de texto de la página (no en el modo lectura).

## Corrección 2 (2026-10-21): oraciones que juntaban varias

Con un libro real se vio que `sents` agrupaba párrafos enteros (hasta 72 tokens) porque spaCy recibe las palabras sin la puntuación exterior y no cortaba. Desde la versión 3 del pipeline (`PIPELINE_VERSION = 3`) las oraciones también se cortan por puntuación final (`. ! ?` seguida de mayúscula, salvo abreviaturas, iniciales y ordinales). El modo `upgrade` (RF-51) recalcula las páginas cuyas `sents` no coinciden con esa segmentación, conservando todo lo demás.

## Corrección 3 (2026-10-21): traducir el trozo exacto, sin botón

La usuaria pidió que al seleccionar salga al instante la traducción de **lo seleccionado**, sin pulsar «Ver la oración completa». Decisión (aprobada por la usuaria): una selección que cubre oraciones enteras usa su traducción precalculada (sin red, RNF-01); un trozo se traduce al momento con un servicio gratuito (MyMemory, `lib/phrase-translate.ts`), llamado desde el navegador, enviando solo el trozo seleccionado. Si falla (sin conexión o límite diario), se muestra el motivo y entonces sí se ofrece «Ver la oración completa». La consulta de una palabra no cambia: sigue sin red. Se actualizó la política de privacidad.
