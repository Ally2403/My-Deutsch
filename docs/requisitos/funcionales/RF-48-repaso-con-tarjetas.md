# RF-48 — Repaso con tarjetas (FSRS)

| Campo                 | Valor                                                         |
| --------------------- | ------------------------------------------------------------- |
| **ID**                | RF-48                                                         |
| **Título**            | Repaso con tarjetas (FSRS)                                    |
| **Módulo**            | M-7 Vocabulario personal                                      |
| **Prioridad**         | Alta                                                          |
| **Fase**              | 6                                                             |
| **Estado**            | En progreso                                                   |
| **Dependencias**      | [RF-27](RF-27-guardar-palabras-en-el-diccionario-personal.md) |
| **Reglas de negocio** | RN-04                                                         |

## Descripción

Tarjeta «Repaso de hoy» en la pantalla principal y sesión de repaso en `/repaso` con el diccionario personal, programada con FSRS (`ts-fsrs`). Filtros por libro, género, tipo de palabra y estado (vencidas / nuevas / difíciles) y límites diarios (10 nuevas, 50 repasos; el día empieza a las 04:00 hora local).

## Justificación

La usuaria quiere repasar su vocabulario con tarjetas, no solo consultarlo.

## Criterios de aceptación

1. Tablas `card_state` y `review_log` con RLS por `auth.uid()` y pruebas pgTAP (aislamiento, anon, idempotencia por `id`, borrado en cascada).
2. La tarjeta de la pantalla principal muestra «Hoy: N para repasar · M nuevas», «Estás al día» o una invitación a leer.
3. La sesión permite voltear (Espacio), calificar (Otra vez/Difícil/Bien/Fácil, teclas 1–4) con el intervalo resultante, deshacer, ver el progreso y una pantalla final; estado vacío sin tarjetas.
4. Los filtros se conservan en la URL; las palabras «conocidas» no entran en la cola, ni a mitad de sesión.
5. Reenviar una reseña no duplica `review_log`; sin conexión las reseñas se encolan y se envían al reconectar.
6. Género en color y texto (RNF-09); objetivos ≥ 44 px; 360/768/1280 y WebKit iPhone; 2 500 palabras arman la cola en < 50 ms.

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-20. Plan: [`superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md`](../../superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md).

## Verificación (2026-10-20)

Estado: **En progreso** (falta la prueba con sesión real).

- c1 ✅ migración `20261020100000_repaso.sql` aplicada en producción (aditiva). `supabase/tests/repaso.test.sql` 9/9 contra la base real en una transacción con rollback: aislamiento entre usuarias (lectura, escritura y actualización), `anon` sin acceso, idempotencia por `id` (`on conflict do nothing`), `rating` de 1 a 4 y borrado en cascada al borrar la cuenta. `get_advisors` sin avisos nuevos (solo la FK `card_state.lexicon_id` sin índice, igual que `user_words`).
- c2 ✅ por prueba de componente (`components/review-today-card.test.tsx`: «Hoy: N para repasar · M nuevas», «Estás al día», invitación a leer, conocidas excluidas, límites). Sin verificar con datos reales en `/grupos`.
- c3 ✅ pruebas de componente y e2e sobre `/repaso/demo` (360/768/1280 y WebKit iPhone): voltear con Espacio, teclas 1–4, intervalo en cada botón, deshacer, progreso «N de M», pantalla final, estado vacío.
- c4 ✅ filtros en la URL (e2e con recarga) y «Ya la sé» saca la palabra de la cola a mitad de sesión (prueba de componente; escribe `user_words.status = 'known'`).
- c5 ✅ pruebas unitarias de `review-sync` (doble envío = una fila, cola persistente, reenvío al reconectar). Sin verificar cortando la red en un teléfono real.
- c6 ✅ artículo en color y en texto (`data-testid="card-article"`), sin desborde y todos los controles ≥ 44 px en los 4 perfiles; 2 500 palabras arman la cola en < 50 ms (prueba unitaria).
- Suite: 562 pruebas unitarias; e2e completo 157/157; `tsc` y `eslint` limpios.
- **Sin verificar:** flujo con sesión real (guardado en `card_state`/`review_log` desde el navegador, insignia de la barra y segunda fila de navegación en móvil con sesión), iPhone real, RLS desde el cliente de la app.
- Decisión autónoma: sin pasos de aprendizaje de minutos (`card_state` no guarda `learning_steps`); «Otra vez» reinserta la tarjeta al final de la sesión. La reseña se guarda tras 6 s (ventana de «Deshacer») o al calificar otra / salir. «Difíciles» (lapses ≥ 2) no consume los límites diarios. En el anverso es→de solo se muestra la frase si el hueco oculta la palabra (para no revelar la respuesta).
