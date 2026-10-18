# ADR-006 · Disparo del worker con `workflow_dispatch` (reemplaza el mecanismo de ADR-002)

**Estado:** Aceptada (2026-10-18) · **Reemplaza:** el disparo con `repository_dispatch` de [ADR-002](ADR-002-worker-en-github-actions.md) · **Requisitos:** RF-11, RF-12, RNF-06

## Contexto
La API dispara `process-book.yml` con un token fino guardado en Vercel. El diseño decía «permiso Actions (escritura)», pero el endpoint `repository_dispatch` exige el permiso **Contents (escritura)**, que además permitiría modificar el código del repositorio. Con el token real, el disparo fallaba (el libro quedaba registrado pero sin iniciar el procesamiento).

## Decisión
La API llama a `POST /repos/{repo}/actions/workflows/process-book.yml/dispatches` con `{ ref: "main", inputs: { book_id } }`. El workflow ya declara `workflow_dispatch` con la entrada `book_id`, y el resto de ADR-002 (runner, caché, reanudación, secretos) no cambia.

## Consecuencias
- El token solo necesita **Actions: Read and write** sobre este repositorio (mínimo privilegio; sin acceso al contenido).
- El workflow debe existir en `main` (ya ocurre).
- Un fallo de GitHub se registra con su estado HTTP (sin token ni cuerpo) para diagnosticar permisos.
