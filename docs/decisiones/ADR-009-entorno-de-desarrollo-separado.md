# ADR-009 — Entorno de desarrollo separado de producción

- **Estado:** aceptada (2026-10-21)
- **Requisito:** [RNF-20](../requisitos/no-funcionales/RNF-20-entorno-de-desarrollo-aislado.md)

## Contexto

Ya hay usuarias reales en producción (Supabase «My Deutsch Project» + Vercel desde `main`). Probar ahí pone en riesgo sus datos.

## Decisión

- **Rama `dev`:** integra todo el trabajo (ramas `feat/RF-xx-…` se fusionan en `dev`). `main` es producción y solo cambia cuando la usuaria pide «subir a producción».
- **Base de datos de dev:** proyecto Supabase aparte, «My Deutsch Dev» (ref `eaanrkngazophdobzvzx`, región us-east-1, plan gratuito: 2 proyectos activos). Mismas migraciones que producción, sin datos reales. Usuario de pruebas `dev@mydeutsch.test` (solo existe en dev).
- **Variables:** el cliente solo necesita `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de dev (públicas). Para probar en local se pasan en la línea de comandos, sin escribir `.env`.
- **No se usó una rama de Supabase (branching):** tiene costo por hora; un segundo proyecto gratuito no.

## Diferencia conocida con producción

La migración `20261017180200_revocar_funciones_internas.sql` menciona `public.rls_auto_enable()`, función que Supabase creó solo en el proyecto de producción. En dev se aplicó sin esa función. No afecta el comportamiento.

## Procedimiento «subir a producción» (solo con orden de la usuaria)

1. En `dev`: `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm e2e` en verde.
2. Migraciones nuevas (si las hay): aplicarlas primero a producción (`apply_migration`; son aditivas), después desplegar.
3. `git checkout main && git merge --no-ff dev` (o PR `dev` → `main`) y `git push origin main`; Vercel despliega producción.
4. Comprobar el despliegue (`list_deployments`) y abrir la app de producción.

## Pendiente de la usuaria

- Dar al MCP de Vercel acceso al equipo (hoy responde 403) o ejecutar `vercel login` en este equipo, y asignar las variables de dev solo al entorno **Preview** de la rama `dev`:
  `NEXT_PUBLIC_SUPABASE_URL=https://eaanrkngazophdobzvzx.supabase.co` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_wHGLMcrAn66ekl7zax_30Q_RgO6YCVH`. Mientras no se haga, **una vista previa de Vercel de `dev` o de una rama `feat/*` podría usar las variables de producción**: no la uses con datos reales.
- Para subir libros en dev (procesamiento) harían falta `SUPABASE_SERVICE_ROLE_KEY` de dev y secretos de Actions apuntando a dev; no se configuraron (CLAUDE.md prohíbe que Claude maneje secretos).

## Procesar libros en dev (ampliación operativa, RNF-20)

`process-book.yml` elige la base según la rama desde la que corre: en `main` usa los secretos de producción; en cualquier otra rama (`dev`) usa la URL de «My Deutsch Dev» y el secreto `SUPABASE_SERVICE_ROLE_KEY_DEV`. La app de dev dispara la copia de la rama `dev` con `GITHUB_DISPATCH_REF=dev` (variable de Vercel solo para Preview de `dev`). Al subir a producción, `main` conserva el comportamiento actual.

Variables de Vercel (Preview, rama `dev`): `SUPABASE_SERVICE_ROLE_KEY` (de dev), `GITHUB_DISPATCH_TOKEN` y `GITHUB_DISPATCH_REF=dev`.
