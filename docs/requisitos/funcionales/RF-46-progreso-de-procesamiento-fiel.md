# RF-46 — Progreso de procesamiento fiel

| Campo                 | Valor                                             |
| --------------------- | ------------------------------------------------- |
| **ID**                | RF-46                                             |
| **Título**            | Progreso de procesamiento fiel                    |
| **Módulo**            | M-4 Procesamiento (worker)                        |
| **Prioridad**         | Alta                                              |
| **Fase**              | 6                                                 |
| **Estado**            | Pendiente                                         |
| **Dependencias**      | [RF-12](RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | —                                                 |

## Descripción

La barra de carga de un libro mide hojas del PDF (no páginas lógicas): llega al 100 % solo cuando el trabajo termina y, en ese momento, el libro está «Listo» (en el siguiente ciclo de sondeo, ≤ 4 s).

## Justificación

La usuaria vio la barra llegar al 100 % a la mitad del trabajo porque las hojas dobles producen 2 páginas; luego había que esperar otro tanto.

## Criterios de aceptación

1. `jobs.pages_done` cuenta hojas del PDF y nunca supera `pages_total`; no retrocede.
2. Con hojas dobles (incluido un libro de 400 hojas todas dobles) y con una sola hoja, la barra llega a 100 % exactamente al terminar.
3. El texto de estado dice «Procesando hoja X de Y».
4. Mientras el libro procesa, la interfaz sondea cada ≤ 4 s y pasa a «Listo» en el sondeo siguiente a llegar a 100 %.
5. Pruebas automáticas (worker, dominio, componente y pgTAP) con los casos anteriores.

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-20. Plan: [`superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md`](../../superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md).

## Verificación

Pendiente.
