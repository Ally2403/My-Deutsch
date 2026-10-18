# RF-13 — Ver estado del procesamiento

| Campo | Valor |
|---|---|
| **ID** | RF-13 |
| **Título** | Ver estado del procesamiento |
| **Módulo** | M-3 Biblioteca |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | En progreso |
| **Dependencias** | [RF-12](RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | — |

## Descripción
La biblioteca muestra el estado de cada libro (En cola, Procesando X/Y páginas, Listo, Error) y se actualiza sin recargar la página.

## Justificación
Procesar un libro tarda minutos; el usuario necesita saber que avanza.

## Criterios de aceptación
1. Durante el procesamiento se muestra el avance en páginas, actualizado al menos cada 30 segundos.
2. Mientras se procesa, se pueden abrir las páginas ya listas.
3. Si falla, se muestra "Error" con el motivo resumido y un botón "Reintentar" para quien lo subió o para el administrador.

## Verificación
Entrega 2d (2026-10-18; Vitest 353/353):

- ✅ (pruebas, con temporizadores falsos) Criterio 1: `BookStatus` muestra «En cola», «Procesando X/Y páginas», «Listo» y «Error» con motivo resumido; sondea cada 10 s (≤ 30 s) mientras el libro está en cola o procesando y se detiene al terminar; un job `superseded` nunca se muestra como error.
- ✅ (pruebas) Criterio 3: «Reintentar» solo para quien subió el libro o un administrador de un grupo que lo tiene (`request_retry`, pgTAP 18/18 en el proyecto real); también para un libro atascado en cola más de 5 minutos (disparo perdido); un doble toque hace una sola llamada.
- ✅ (código) Criterio 2: `/libros/[id]` abre el lector con las páginas ya publicadas mientras el libro se procesa; una página aún no publicada muestra «Esta página aún se está procesando».
- Sin verificar: todo lo anterior en el navegador con sesión real y con el worker procesando de verdad (Actions); el diseño de `/libros/[id]` a 360/768/1280 px y en WebKit/iPhone (solo se comprobó que `/lector/demo` no cambió: sin scroll de documento a 360 px).
