# My-Deutsch 🇩🇪

Lee tus libros de alemán escaneados como un libro de verdad, pero tocando cualquier palabra para ver su significado en español y su género por color: **der** 🔵 · **das** 🟢 · **die** 🔴.

- 📖 Página original con texto seleccionable
- 👆 Toca una palabra → lema, tipo y significados (también para formas conjugadas y verbos separables)
- 🎨 Colorea todos los sustantivos según su género
- 🧠 Diccionario personal automático, con marcas de "ya la viste" y filtros
- 👥 Grupos de curso: un libro se procesa una vez y lo usan todos, cada uno con su progreso privado
- ✍️ Escribe tus respuestas en los ejercicios del libro
- 📱 Celular (incluido iPhone, instalable como app), tablet y computador

## Documentación
Empieza por [`docs/ESTADO.md`](docs/ESTADO.md) y por [`docs/requisitos/INDEX.md`](docs/requisitos/INDEX.md).

| Documento | Contenido |
|---|---|
| [00 Visión y alcance](docs/00-vision-y-alcance.md) | Contexto, objetivos, supuestos, restricciones |
| [01 Actores](docs/01-actores.md) | Roles del sistema |
| [02 Reglas de negocio](docs/02-reglas-de-negocio.md) | RN-01 a RN-14 |
| [Requisitos](docs/requisitos/INDEX.md) | 37 RF + 15 RNF, un archivo por requisito |
| [03 Arquitectura](docs/03-modulos-y-arquitectura.md) | Componentes, módulos, presupuesto gratuito |
| [04 Modelo de datos](docs/04-modelo-de-datos.md) | Diagrama ER, JSON de página, RLS |
| [05 Casos de uso](docs/05-casos-de-uso/README.md) | CU-01 a CU-09 |
| [06 Plan](docs/06-plan-de-desarrollo.md) | Fases y entregables |
| [Decisiones](docs/decisiones/) | ADR-001 a ADR-005 |

## Desarrollo con Claude Code
El repositorio incluye `CLAUDE.md`, hooks en `.claude/hooks/` y plugins en `.claude/settings.json` (Superpowers, frontend-design, ui-ux-pro-max, Supabase, Playwright, Context7, Vercel, security-guidance y LSP). Al abrir el proyecto con Claude Code, acepta instalar los marketplaces y plugins sugeridos.
