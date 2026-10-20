# RF-47 — Traducir frases seleccionadas

| Campo                 | Valor                                                                              |
| --------------------- | ---------------------------------------------------------------------------------- |
| **ID**                | RF-47                                                                              |
| **Título**            | Traducir frases seleccionadas                                                      |
| **Módulo**            | M-5 Lector                                                                         |
| **Prioridad**         | Alta                                                                               |
| **Fase**              | 6                                                                                  |
| **Estado**            | Pendiente                                                                          |
| **Dependencias**      | [RF-21](RF-21-consultar-palabra.md), [RF-43](RF-43-calidad-de-las-traducciones.md) |
| **Reglas de negocio** | —                                                                                  |

## Descripción

Arrastrando con el mouse (o con el modo «Frase» de dos toques en celular y tableta, o la tecla T sobre una palabra enfocada) se abre un panel con la traducción de la(s) oración(es) que cubre la selección y las glosas de sus palabras. Sin red: la traducción por oración viene precalculada (Opus-MT) en el campo opcional `sents` del JSON de página.

## Justificación

Entender frases completas con su contexto. Decisión autónoma: no se traduce «exactamente lo seleccionado» porque exigiría un servicio externo; se traduce la oración que lo contiene (costo cero y sin enviar texto a terceros).

## Criterios de aceptación

1. El JSON de página v1 admite `sents` opcional (rangos de tokens sin solaparse, `es` ≤ 600 caracteres, ≤ 80 por página, ≤ 3 KB por página); las páginas sin `sents` siguen siendo válidas.
2. Selección con mouse, modo «Frase» (dos toques) y tecla T abren el panel; una sola palabra no abre el de frase; en modo «Escribir» no se abre.
3. El panel muestra el texto, la traducción de cada oración cubierta (con el aviso de traducción automática), glosas con género en color y artículo (RNF-09) y botón «Copiar».
4. Libro antiguo sin `sents`: solo glosas y el aviso «Sube de nuevo el libro para traducir oraciones completas.»
5. Ninguna petición de red al abrir el panel (RNF-01); `role="dialog"`, Esc cierra, axe sin violaciones; 360/768/1280 y WebKit iPhone.

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-20. Plan: [`superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md`](../../superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md).

## Verificación

Pendiente.
