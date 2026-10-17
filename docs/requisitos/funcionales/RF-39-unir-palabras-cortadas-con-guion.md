# RF-39 — Unir palabras cortadas con guion

| Campo | Valor |
|---|---|
| **ID** | RF-39 |
| **Título** | Unir palabras cortadas con guion |
| **Módulo** | M-6 Léxico |
| **Prioridad** | Alta |
| **Fase** | 2 |
| **Estado** | En progreso |
| **Dependencias** | [RF-12](RF-12-procesar-libro-en-segundo-plano.md), [RF-23](RF-23-resolver-formas-flexionadas-al-lema.md) |
| **Reglas de negocio** | RN-06 |

## Descripción
Cuando una palabra se corta al final de una línea con guion ("Normalerwei-" / "se"), el worker une las dos partes en una sola palabra para analizarla (lema, tipo, género), conservando las dos cajas en la página. Tocar cualquiera de las dos partes muestra la palabra completa y resalta ambas.

## Justificación
En los libros escaneados los cortes de línea son frecuentes; tratar cada mitad por separado produce consultas fallidas.

## Criterios de aceptación
1. En las páginas de muestra, ≥ 95 % de las palabras cortadas al final de línea se unen correctamente ("Normalerwei-se" → "Normalerweise").
2. Los guiones que son parte de la palabra se conservan ("E-Mail", "Ost-West"); si la unión sin guion no existe en el léxico y la forma con guion sí, se conserva el guion.
3. El JSON de página guarda una sola entrada de token con dos cajas (ver docs/04).
4. Al tocar cualquiera de las dos partes, el panel muestra la palabra unida y se resaltan ambas partes.

## Verificación
Spike (2026-10-17): criterio 1 ✅ (29/30 = 96,7 %); 2 ✅ solo con pruebas unitarias (no hay casos en la muestra); 3 y 4 quedan para la Fase 3 (JSON de página y lector).
