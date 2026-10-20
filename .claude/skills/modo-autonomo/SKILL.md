---
name: modo-autonomo
description: Usar al retomar el plan docs/superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md (tras /clear, compactación o reinicio) o cuando la usuaria pida trabajo autónomo prolongado sin confirmaciones.
---

# Modo autónomo (My-Deutsch)

## Cómo retomar tras /clear
1. Leer `docs/superpowers/plans/2026-10-20-mejoras-lectura-y-carga.md`, `docs/ESTADO.md` y `git log -10`.
2. Continuar en la primera casilla `- [ ]` sin marcar del plan; marcar cada casilla al terminarla y hacer commit.
3. Seguir las reglas de abajo (copia fiel de la sección del plan; si difieren, manda el plan).


**Mandato:** la usuaria quiere que **todo este plan se ejecute de forma autónoma, durante muchas horas, sin pedirle confirmación ni ayuda**. No uses `AskUserQuestion`. No te detengas a «avisar y esperar». Decide con las reglas de abajo, deja constancia y sigue.

**Cómo se logra (mecanismos concretos):**

1. **Estado durable fuera del contexto.** Este archivo (casillas) + `docs/ESTADO.md` («Retomar aquí») + commits pequeños. Tras compactación o reinicio de contexto, lo primero es releer este plan, `ESTADO.md` y `git log -10`, y continuar en la primera casilla sin marcar. Actualiza `ESTADO.md` al cerrar cada tarea (no solo al final).
2. **Contexto liviano.** Usa `superpowers:subagent-driven-development`: un subagente nuevo por tarea (en worktree propio, `superpowers:using-git-worktrees`), y un revisor nuevo antes de pasar a la siguiente. El agente principal solo coordina, fusiona y actualiza estado. Las fases 1, 2 y 4 son independientes (worker / lector / base de datos) y pueden ir en paralelo; la 3 depende de la 1; la 5 y 6 van al final.
3. **Sin avisos de permiso.** La Tarea 0.2 deja una lista de permisos en `.claude/settings.local.json` (vía skill `update-config`). Recomendación de arranque para la usuaria: abrir la sesión en un modo que no pregunte por cada acción (p. ej. `claude --permission-mode acceptEdits`, o el modo automático/clasificador si lo tiene) **y** con esa lista; los hooks del proyecto siguen activos y se respetan.
4. **El CI es el juez, no la usuaria.** Flujo por fase: rama → commits → `git push` → `gh pr create` → `gh pr checks --watch` en segundo plano (`run_in_background`, nunca sondeo con `sleep`) → si falla, `superpowers:systematic-debugging` → cuando está verde, `gh pr merge --squash --delete-branch` → comprobar el despliegue de Vercel (herramientas MCP de Vercel `list_deployments`/`get_deployment`) y, para migraciones, `apply_migration` **antes** de fusionar (son aditivas, así que el código viejo sigue funcionando).
5. **No terminar el turno mientras haya trabajo.** Termina solo cuando todas las casillas estén marcadas o las que queden sean «pendiente de la usuaria». Para esperas largas (CI, workflow de procesamiento) usa tareas en segundo plano/`Monitor`, no cierres el turno. Si el turno debe terminar, deja `ESTADO.md` listo y, si aplica, programa continuación con `ScheduleWakeup` (modo `/loop` dinámico) con el prompt de arranque de abajo.
6. **Reglas de decisión (en vez de preguntar):** (a) elige la opción más simple que cumpla el criterio de aceptación; (b) si hay dos válidas, la que menos código y menos dependencias añada; (c) cualquier decisión no trivial se anota en el RF/ADR correspondiente en una línea «Decisión autónoma: …»; (d) nunca cambies el alcance: si algo no está cubierto, escribe el requisito nuevo (siguiente ID libre), anótalo como «propuesto por Claude, sin aprobar» y **no lo implementes**.
7. **Cortafuegos contra bucles:** máximo 3 intentos por el mismo problema (el tercero con `systematic-debugging` y evidencia); si persiste, anota «Bloqueado: …» en `ESTADO.md`, abre una tarea de seguimiento y **pasa a la siguiente tarea independiente**. Un e2e inestable se reintenta una vez; si vuelve a fallar se investiga, no se repite. Si faltan < 15 % de tokens de contexto total, cierra la tarea en curso, deja `ESTADO.md` completo y detente.
8. **Lo que la autonomía nunca anula:** reglas de `CLAUDE.md` (sin push forzado, sin secretos ni archivos `.env`, sin atribución, límites del plan gratuito), hooks (`guard-bash`, `guard-secrets`, `post-edit`, `verify-before-stop`; si uno bloquea, se corrige la causa), sin `DROP`/`TRUNCATE`, sin `vercel --prod` ni `supabase db push`, sin tocar datos de usuarias reales.
9. **Lo imposible sin la usuaria no bloquea:** iPhone físico, libro real grande, secretos nuevos, prueba con lector de pantalla. Se registra en `ESTADO.md` bajo «Pendiente de la usuaria» con el paso exacto, el criterio se deja **sin marcar como verificado** («no se pudo verificar: …») y se continúa.

