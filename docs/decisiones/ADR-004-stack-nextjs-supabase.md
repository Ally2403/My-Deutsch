# ADR-004 · Stack: Next.js + Supabase + worker Python

**Estado:** Aceptada (elegida por la usuaria) · **Requisitos:** RF-01–RF-10, RNF-05–RNF-07

- **Next.js (App Router) + TypeScript estricto + Tailwind + shadcn/ui** en Vercel Hobby: despliegue en cada push, vistas previas por PR y PWA con `@serwist/next`.
- **Supabase**: Auth (correo y Google) listo para usar, Postgres con RLS para la privacidad, Storage con URLs firmadas y Realtime para el avance del procesamiento. Elimina un backend propio.
- **Python (uv)** solo para el worker, porque ahí está el ecosistema de OCR y NLP.
- **Pruebas:** Vitest (dominio), pgTAP (RLS), pytest (worker) y Playwright (E2E en Chromium y WebKit/iPhone).

**Consecuencia:** se escribe solo el código propio del dominio; la autenticación, el almacenamiento y la infraestructura ya vienen resueltos.
