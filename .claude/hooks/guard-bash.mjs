// PreToolUse (Bash | PowerShell): bloquea comandos destructivos o irreversibles.
import { readInput, deny, ask } from "./lib.mjs";

const input = readInput();
const cmd = String(input.tool_input?.command ?? "");

// Directorios que sí se pueden borrar sin preguntar (artefactos de build).
const SAFE_DIRS = /^(\.\/)?(node_modules|\.next|dist|build|coverage|\.turbo|\.venv|__pycache__|\.pytest_cache|out)\/?$/;

const rmMatch = cmd.match(/\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+([^;&|]+)/);
if (rmMatch) {
  const targets = rmMatch[2].trim().split(/\s+/);
  if (!targets.every((t) => SAFE_DIRS.test(t.replace(/^["']|["']$/g, "")))) {
    ask(`Borrado recursivo forzado: "${rmMatch[0]}". Confirma que es intencional.`);
  }
}

if (/Remove-Item\b.*-Recurse/i.test(cmd) && !/node_modules|\.next|dist|coverage/i.test(cmd)) {
  ask("Remove-Item -Recurse fuera de carpetas de build. Confirma que es intencional.");
}

const BLOCK = [
  [/git\s+push\b.*(\s--force(?!-with-lease)\b|\s-f\b)/, "git push --force reescribe la historia remota. Usa --force-with-lease o pide permiso a la usuaria."],
  [/git\s+reset\s+--hard/, "git reset --hard descarta cambios sin respaldo. Usa git stash primero."],
  [/git\s+clean\s+-[a-zA-Z]*f/, "git clean -f borra archivos no versionados de forma irreversible."],
  [/git\s+checkout\s+--\s+\./, "git checkout -- . descarta todos los cambios locales."],
  [/\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, "DROP en la base de datos: hazlo en una migración revisada, no en un comando suelto."],
  [/\bTRUNCATE\b/i, "TRUNCATE borra datos de forma irreversible."],
  [/supabase\s+db\s+reset\b.*--linked/, "supabase db reset --linked borra la base de datos de producción."],
];
for (const [re, why] of BLOCK) if (re.test(cmd)) deny(`Bloqueado por guard-bash: ${why}`);

if (/supabase\s+db\s+push\b|vercel\s+.*--prod\b/.test(cmd)) {
  ask("Este comando cambia producción (Supabase/Vercel). Confirma antes de ejecutar.");
}

process.exit(0);
