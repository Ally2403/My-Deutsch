# 06 · Plan de desarrollo

Principio: **definir → validar el riesgo → construir en paralelo → desplegar temprano.** El cuello de botella no es escribir código, sino decidir y verificar. Por eso los requisitos se aprueban antes y el riesgo técnico se prueba primero.

| Fase | Duración estimada | Modelo sugerido | Entregable | Puerta de salida |
|---|---|---|---|---|
| **0 · Setup** | ½ día | Opus 5.5 | Repositorio, CLAUDE.md, hooks, plugins | Hooks probados ✅ |
| **1 · Requisitos y diseño** | 1 día | Opus 5.5 | `docs/` completo + prototipos de pantallas | **La usuaria aprueba los requisitos** |
| **2 · Spike técnico** | 1 día | Opus 5.5 | `worker/spike/`: OCR de 5 páginas reales + 300 palabras de prueba de léxico | RNF-03 ≥ 95 %, RF-23 ≥ 90 %; si no se cumple, se aplica el plan B de ADR-005 |
| **3 · MVP vertical** | 3–4 días | Sonnet 5.5 | Ingreso → grupo → subir → procesar → leer → tocar palabra → color → anotaciones libres → **desplegado** | El curso puede leer el primer libro |
| **4 · Aprendizaje** | 2–3 días | Sonnet 5.5 | Diccionario personal, marcas de "vista", filtros, separables, modo lectura, campos de ejercicio | Prueba con 3–5 compañeros |
| **5 · Pulido** | 2 días | Sonnet 5.5 | Lighthouse, accesibilidad, modo oscuro, exportación, respaldos, carga | RNF-08, RNF-10 y RNF-13 en verde |

## Fase 3 en paralelo (subagentes y worktrees)
Contratos que se fijan primero (medio día): migraciones SQL con RLS, tipos generados y el formato del JSON de página (docs/04). Después se trabaja en tres frentes en paralelo:
1. **Agente A — worker (Python):** pipeline de CU-05 + `process-book.yml` + pruebas con páginas de muestra.
2. **Agente B — lector (UI):** CU-06 y CU-07 con un JSON de página de ejemplo (fixture), sin esperar al worker.
3. **Agente C — cuenta, grupos y biblioteca:** CU-01 a CU-04, RLS y pruebas pgTAP.
Integración: E2E de Playwright para el flujo completo en Chromium y WebKit, y luego despliegue.

## Lo que necesita la usuaria (fuera del código)
- Crear el proyecto de Supabase (gratis) y el cliente OAuth de Google (Google Cloud Console) — Claude da los pasos exactos.
- Conectar el repositorio a Vercel.
- Proporcionar un PDF real (o 5 páginas) para el spike. **Los PDF no se suben al repositorio** (`.gitignore`).
- Decidir si el repositorio es público (Actions ilimitado) o privado (2 000 min/mes).

## Ritual por tarea
`brainstorming` → `writing-plans` → TDD → verificación en el navegador (Playwright en 360/768/1280 + WebKit) → actualizar el estado en `INDEX.md` → commit pequeño.
