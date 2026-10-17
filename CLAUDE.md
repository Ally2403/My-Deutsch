# CLAUDE.md — My-Deutsch

Web app (PWA) que convierte libros de alemán escaneados en PDF en libros interactivos: página original + capa de texto tocable, significado en español por palabra, **colores de género der = azul · das = verde · die = rojo**, diccionario personal automático y grupos de curso que comparten libros con progreso privado. Usuarios: un curso de ~25 estudiantes B1 (vocabulario hasta C1), sobre todo en **celular (incluido iPhone)**, tablet y PC.

## Fuente de verdad
- Estado actual y siguiente paso: `docs/ESTADO.md` (actualízalo al cerrar cada fase o tarea grande).
- Alcance: `docs/requisitos/INDEX.md` → un archivo por RF/RNF. Reglas de negocio: `docs/02-reglas-de-negocio.md` (RN-xx).
- Arquitectura: `docs/03-modulos-y-arquitectura.md`. Datos y formato del JSON de página: `docs/04-modelo-de-datos.md`. Decisiones: `docs/decisiones/ADR-*.md`.

## Reglas de trabajo (obligatorias)
1. **Sin requisito no hay código.** Todo cambio cita el RF/RNF que implementa (en el mensaje de commit y en el PR: `RF-21: panel de palabra`). Si algo no está cubierto, primero se propone el requisito nuevo (mismo formato e ID siguiente) y la usuaria lo aprueba.
2. Al terminar un requisito, verifica **cada criterio de aceptación**, cambia su estado en el archivo y en `INDEX.md`, y reporta lo que no se pudo verificar.
3. Flujo: skill `brainstorming` → `writing-plans` → TDD (`test-driven-development`) → verificación real en el navegador (Playwright 360/768/1280 + WebKit iPhone) → `verification-before-completion`. Para trabajo independiente, usa `subagent-driven-development` con worktrees.
4. No cambies una decisión de un ADR sin escribir un ADR nuevo que la reemplace.
5. Commits pequeños en ramas `feat/RF-xx-...`; nunca hagas push forzado a `main`.

## Stack y comandos
- App: Next.js (App Router) + TypeScript estricto + Tailwind + shadcn/ui, en Vercel. `pnpm dev` · `pnpm typecheck` · `pnpm lint` · `pnpm test` (Vitest) · `pnpm test:quick` (lo usa el hook Stop) · `pnpm e2e` (Playwright).
- Datos: Supabase (Auth correo + Google, Postgres + RLS, Storage, Realtime). Migraciones en `supabase/migrations/`, pruebas RLS con pgTAP en `supabase/tests/`.
- Worker: Python con `uv` en `worker/` (PyMuPDF, Tesseract `deu`, spaCy `de_core_news_md`, Argos en→es). `uv run pytest` · `uv run ruff check`. Corre en GitHub Actions (`process-book.yml`, ADR-002).
- Para documentación de librerías usa Context7 (no confíes en la memoria para APIs de Next.js, Supabase o spaCy).

## Convenciones
- UI, textos y documentación en **español**; identificadores y código en **inglés**.
- Mobile-first: diseña a 360 px y luego amplía. Objetivos táctiles ≥ 44 px, sin dependencias de hover, `env(safe-area-inset-*)`, login de Google por redirección (iOS).
- Lógica de dominio pura y probada en `lib/domain/` (colores de género, reglas de vocabulario, coordenadas, búsqueda normalizada ß/ss y ä/ae). Los componentes no contienen reglas de negocio.
- Colores de género centralizados en tokens CSS (`--gender-m`, `--gender-n`, `--gender-f`) que cumplen un contraste ≥ 4.5:1 en tema claro y oscuro; el género nunca se indica solo con color (RNF-09).
- La consulta de una palabra **no hace peticiones de red**: los datos vienen en el JSON de la página (RNF-01).

## Seguridad y privacidad
- Toda tabla nueva lleva `enable row level security` y políticas por `auth.uid()` (RN-04, RNF-06); el hook `post-edit` lo vigila.
- La service role key solo existe en los secretos de GitHub Actions y en las variables de servidor de Vercel; nunca en el cliente ni en el repositorio (lo bloquea el hook `guard-secrets`).
- Claude no escribe archivos `.env`; mantiene `.env.example` y pide a la usuaria que llene los valores.
- Los PDF de libros nunca se suben al repositorio.

## Plan gratuito (no exceder)
Supabase: 500 MB de base de datos, 1 GB de Storage y 5 GB/mes de egress; se pausa tras 7 días sin actividad (hay un workflow keep-alive). Vercel Hobby. Actions: 2 000 min/mes si el repositorio es privado. Solo se guarda en `lexicon` el léxico usado por los libros (ADR-003). Imágenes WebP de 1 600 px y ≤ 250 KB por página.

## Hooks de este proyecto (`.claude/hooks/`)
`session-context` (estado al iniciar) · `guard-bash` (bloquea push forzado, reset --hard, DROP/TRUNCATE; pide confirmación antes de cambios en producción) · `guard-secrets` (bloquea secretos y `.env`) · `post-edit` (Prettier, ESLint y Ruff, alerta de RLS, recordatorio de INDEX) · `verify-before-stop` (typecheck + tests rápidos antes de terminar). Si un hook bloquea algo, corrige la causa: no lo desactives.
