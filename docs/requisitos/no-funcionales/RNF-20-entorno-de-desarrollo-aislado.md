# RNF-20 — Entorno de desarrollo aislado de producción

| Campo                 | Valor                                                   |
| --------------------- | ------------------------------------------------------- |
| **ID**                | RNF-20                                                  |
| **Título**            | Entorno de desarrollo aislado de producción             |
| **Módulo**            | M-T Transversal                                         |
| **Prioridad**         | Alta                                                    |
| **Fase**              | 6                                                       |
| **Estado**            | En progreso                                             |
| **Dependencias**      | [RNF-06](RNF-06-aislamiento-de-datos-personales-rls.md) |
| **Reglas de negocio** | RN-04                                                   |

## Descripción

Con usuarias reales en producción, todo el trabajo y las pruebas ocurren en un entorno de desarrollo con su propia base de datos (proyecto Supabase «My Deutsch Dev») y la rama `dev` de Git. `main` es producción y solo cambia cuando la usuaria pide «subir a producción». Las migraciones se aplican primero en dev y luego, con orden expresa, en producción.

## Justificación

Probar en producción pone en riesgo los datos y la experiencia de usuarias reales.

## Criterios de aceptación

1. Existe un proyecto Supabase de dev con las mismas migraciones y RLS que producción, sin datos reales.
2. Existe la rama `dev`; el trabajo se integra en `dev` y `main` solo recibe cambios por orden de la usuaria.
3. Las variables de dev (URL y clave pública de dev) no se mezclan con las de producción; ninguna clave secreta entra al repositorio.
4. Las vistas previas de Vercel de la rama `dev` usan la base de dev (**no se pudo verificar: el MCP de Vercel no tiene acceso al equipo; ver `docs/ESTADO.md`**).
5. Procedimiento «subir a producción» documentado en `docs/ESTADO.md`.

## Aprobación

Aprobado por pedido explícito de la usuaria, 2026-10-21.

## Verificación

2026-10-21: criterios 1, 2 y 3 cumplidos (proyecto `eaanrkngazophdobzvzx`, 13 migraciones, RLS en las 15 tablas, rama `dev`). Criterio 4: pendiente (variables de Vercel sin acceso). Criterio 5: ver `docs/ESTADO.md`.
