# RF-48 — Repaso con tarjetas (FSRS)

| Campo                 | Valor                                                         |
| --------------------- | ------------------------------------------------------------- |
| **ID**                | RF-48                                                         |
| **Título**            | Repaso con tarjetas (FSRS)                                    |
| **Módulo**            | M-7 Vocabulario personal                                      |
| **Prioridad**         | Alta                                                          |
| **Fase**              | 6                                                             |
| **Estado**            | Pendiente                                                     |
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

## Verificación

Pendiente.
