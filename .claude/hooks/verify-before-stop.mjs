// Stop: antes de terminar un turno, corre typecheck y tests rápidos si hubo cambios de código.
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readInput, projectDir } from "./lib.mjs";

const input = readInput();
if (input.stop_hook_active) process.exit(0); // evita bucles infinitos

const changed = spawnSync("git", ["status", "--porcelain"], { cwd: projectDir, encoding: "utf8" }).stdout ?? "";
const codeChanged = changed.split("\n").some((l) => /\.(ts|tsx|js|jsx|py|sql)$/.test(l.trim()));
if (!codeChanged) process.exit(0);

const failures = [];
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", shell: process.platform === "win32", timeout: 240000 });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
};

const pkg = join(projectDir, "package.json");
if (existsSync(pkg)) {
  const scripts = JSON.parse(readFileSync(pkg, "utf8")).scripts ?? {};
  for (const s of ["typecheck", "test:quick"]) {
    if (scripts[s]) {
      const r = run("pnpm", ["run", "-s", s], projectDir);
      if (!r.ok) failures.push(`pnpm ${s} falló:\n${r.out.slice(-3000)}`);
    }
  }
}

const worker = join(projectDir, "worker");
if (existsSync(join(worker, "pyproject.toml")) && changed.includes("worker/")) {
  const r = run("uv", ["run", "pytest", "-q", "-x", "-m", "not slow"], worker);
  if (!r.ok && !/no tests ran/.test(r.out)) failures.push(`pytest del worker falló:\n${r.out.slice(-3000)}`);
}

if (failures.length) {
  process.stderr.write(`Verificación antes de terminar (hook Stop) falló. Corrige esto antes de dar la tarea por terminada:\n\n${failures.join("\n\n")}`);
  process.exit(2);
}
process.exit(0);
