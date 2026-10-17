// PostToolUse (Write | Edit | MultiEdit): formatea/lintea el archivo y revisa reglas del proyecto.
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative, extname } from "node:path";
import { readInput, postContext, projectDir } from "./lib.mjs";

const input = readInput();
const file = String(input.tool_input?.file_path ?? "");
if (!file || !existsSync(file)) process.exit(0);

const rel = relative(projectDir, file).replace(/\\/g, "/");
const ext = extname(file);
const notes = [];

function run(cmd, args, cwd = projectDir) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", shell: process.platform === "win32" });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

// 1) Formato y lint de TypeScript/JS/MD (solo si el proyecto ya tiene las herramientas).
const bin = (n) => join(projectDir, "node_modules", ".bin", n);
if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".json", ".md"].includes(ext) && existsSync(bin("prettier"))) {
  run(bin("prettier"), ["--write", file]);
}
if ([".ts", ".tsx", ".js", ".jsx"].includes(ext) && existsSync(bin("eslint"))) {
  const r = run(bin("eslint"), ["--fix", file]);
  if (!r.ok) notes.push(`ESLint encontró problemas en ${rel}:\n${r.out.slice(0, 2000)}`);
}

// 2) Python del worker con ruff (vía uv si está disponible).
if (ext === ".py") {
  const worker = join(projectDir, "worker");
  if (existsSync(join(worker, "pyproject.toml"))) {
    run("uv", ["run", "ruff", "format", file], worker);
    const r = run("uv", ["run", "ruff", "check", "--fix", file], worker);
    if (!r.ok) notes.push(`Ruff encontró problemas en ${rel}:\n${r.out.slice(0, 2000)}`);
  }
}

// 3) Migraciones SQL: toda tabla nueva necesita Row Level Security (RNF-06).
if (rel.startsWith("supabase/migrations/") && ext === ".sql") {
  const sql = readFileSync(file, "utf8");
  const tables = [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/gi)].map((m) => m[1].replace(/"/g, ""));
  const missing = tables.filter((t) => !new RegExp(`alter\\s+table\\s+${t.replace(".", "\\.")}\\s+enable\\s+row\\s+level\\s+security`, "i").test(sql));
  if (missing.length) notes.push(`RNF-06: las tablas ${missing.join(", ")} no tienen "enable row level security" ni políticas en ${rel}. Agrégalas antes de seguir.`);
}

// 4) Requisitos: mantener el índice sincronizado.
if (/^docs\/requisitos\/(funcionales|no-funcionales)\//.test(rel)) {
  notes.push(`Editaste ${rel}. Verifica que docs/requisitos/INDEX.md refleje el título, prioridad y estado actualizados.`);
}

if (notes.length) postContext(notes.join("\n\n"));
process.exit(0);
