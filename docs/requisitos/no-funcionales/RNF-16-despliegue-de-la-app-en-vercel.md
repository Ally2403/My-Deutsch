# RNF-16 — Despliegue de la app en Vercel

| Campo | Valor |
|---|---|
| **ID** | RNF-16 |
| **Título** | Despliegue de la app en Vercel |
| **Módulo** | M-T Transversal |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-36](../funcionales/RF-36-interfaz-responsive-en-celular-tablet-y-computador.md) |
| **Reglas de negocio** | — |

## Descripción
La aplicación Next.js se despliega en Vercel Hobby como un único servicio (`app`) con una vista previa por rama y por PR. El worker de Python (`worker/`) no se despliega en Vercel: corre en GitHub Actions (ADR-002), y `worker/spike` es solo el experimento de la Fase 2.

## Justificación
Vercel detecta la carpeta `worker/` y propone desplegarla como un segundo servicio, y no permite crear el proyecto hasta que el repositorio declare su configuración. Fijar la configuración evita desplegar por error el worker, que no cabe en funciones serverless.

## Criterios de aceptación
1. `vercel.json` declara solo el servicio `app` (`root: "."`, `framework: "nextjs"`) y enruta todo el tráfico hacia él.
2. El proyecto se crea en Vercel sin servicios adicionales y compila.
3. `/lector/demo` carga en la dirección de vista previa.
4. Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` se configuran en Vercel; la clave de service role no se configura en el cliente (ver CLAUDE.md, Seguridad).

## Verificación (2026-10-19)
- Criterios 1–3 ✅ `vercel.json` solo con el servicio `app`; producción en https://my-deutsch.vercel.app responde 200 en `/lector/demo` con HSTS; la usuaria lo usa con un libro real.
- Criterio 4 ◐ la app funciona con esas variables; no se pudo listar las variables de Vercel (el MCP no tiene permiso sobre el equipo) ni comprobar que la service role no esté en el cliente más allá de que el código no la importa en `use client`.
