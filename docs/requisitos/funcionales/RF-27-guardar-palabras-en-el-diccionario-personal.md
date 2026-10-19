# RF-27 — Guardar palabras en el diccionario personal

| Campo | Valor |
|---|---|
| **ID** | RF-27 |
| **Título** | Guardar palabras en el diccionario personal |
| **Módulo** | M-7 Vocabulario personal |
| **Prioridad** | Alta |
| **Fase** | 4 |
| **Estado** | Hecho |
| **Dependencias** | [RF-21](RF-21-consultar-palabra.md) |
| **Reglas de negocio** | RN-05, RN-06 |

## Descripción
Cada consulta guarda o actualiza automáticamente la entrada en el diccionario personal del usuario (lema, tipo, género, significados, contador, primera aparición con oración de contexto y fechas).

## Justificación
La usuaria pidió que las palabras averiguadas se guarden solas.

## Criterios de aceptación
1. Tras consultar una palabra nueva, aparece en el diccionario personal con estado "vista" y contador 1.
2. Consultar de nuevo el mismo lema (en cualquier forma) incrementa el contador y no crea un duplicado.
3. Funciona sin conexión momentánea: la consulta se encola y se sincroniza al volver la red.

## Verificación (2026-10-19)
- Implementado: función `record_lookup` (`supabase/migrations/20261019100000_registrar_consulta.sql`, `security invoker`, RLS propia), cola local `lib/domain/lookup-queue.ts` y `useLookupSync` conectado al lector de `/libros/[id]`.
- Criterios 1 y 2 ✅ en la base real con la prueba `supabase/tests/record_lookup.test.sql` ejecutada en una transacción con rollback: primera consulta → estado «seen», contador 1; segunda → contador 2, una sola fila, conserva la primera oración; otro usuario no ve nada; sin sesión → `not_authenticated`.
- Criterio 3 ✅ por pruebas unitarias de la cola (reintento tras fallo, persistencia, orden, sin doble envío); sin verificar cortando la red en un teléfono real.
- **Pendiente para que funcione: aplicar la migración `20261019100000_registrar_consulta.sql` al proyecto Supabase** (el clasificador bloqueó aplicarla desde Claude). Hasta entonces las consultas quedan en la cola del navegador y se reenvían solas. La pantalla del diccionario es RF-30.

## Cierre del MVP (2026-10-19)
Estado: **Hecho**. Verificación: pruebas automáticas (463 unitarias, e2e en Chromium 360/768/1280 y WebKit iPhone, CI) y, según la usuaria, prueba manual en producción (ingreso con correo y con Google, sesión, libro real y iPhone real) sin problemas.
- Limitación conocida: la cola offline no se probó cortando la red en un teléfono real.
