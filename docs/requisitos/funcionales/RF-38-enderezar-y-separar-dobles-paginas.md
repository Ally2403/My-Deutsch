# RF-38 — Enderezar y separar dobles páginas

| Campo | Valor |
|---|---|
| **ID** | RF-38 |
| **Título** | Enderezar y separar dobles páginas |
| **Módulo** | M-4 Procesamiento (worker) |
| **Prioridad** | Alta |
| **Fase** | 2 |
| **Estado** | En progreso |
| **Dependencias** | [RF-12](RF-12-procesar-libro-en-segundo-plano.md) |
| **Reglas de negocio** | — |

## Descripción
Los escaneos pueden venir girados (90°, 180° o 270°) y con dos páginas del libro en una sola hoja del PDF. El worker endereza cada hoja, detecta si es una doble página y la divide en dos páginas lógicas, cada una con su número impreso.

## Justificación
El PDF de muestra del curso (*Der Schatz*) trae cada hoja girada 90° y con dos páginas lado a lado. Sin separarlas, en el celular la página se vería diminuta y el orden de lectura del OCR mezclaría las dos columnas.

## Criterios de aceptación
1. En el PDF de muestra, las 5 hojas producen 10 páginas lógicas derechas, en el orden correcto (izquierda antes que derecha).
2. Una hoja que ya es una sola página derecha no se divide ni se gira.
3. Cada página lógica guarda el número impreso cuando el OCR lo detecta en el pie (p. ej. 6 y 7), y si no, solo el índice secuencial.
4. El corte cae en el lomo: ninguna palabra del texto queda partida entre las dos páginas.

## Verificación
Spike (2026-10-17): criterio 1 ✅ (10 páginas en orden); 2 ✅ (prueba unitaria con una página sencilla y OSD en 0/90/180/270°); 3 ✅ (4–13, por votación del desfase); 4 ✅ (el lomo cae en una franja sin tinta en las 5 hojas y las referencias de texto están completas). Falta integrarlo en el worker (Fase 3).
