// SessionStart: da a Claude el estado actual del proyecto al iniciar cada sesión.
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { projectDir } from "./lib.mjs";

const out = ["## Estado de My-Deutsch"];

const estado = join(projectDir, "docs", "ESTADO.md");
if (existsSync(estado)) out.push(readFileSync(estado, "utf8").trim());

const index = join(projectDir, "docs", "requisitos", "INDEX.md");
if (existsSync(index)) {
  const rows = readFileSync(index, "utf8").split("\n").filter((l) => /^\|\s*RN?F-\d+/.test(l));
  const pending = rows.filter((l) => /Pendiente|En progreso/i.test(l));
  out.push(`Requisitos: ${rows.length} en total, ${pending.length} pendientes o en progreso (ver docs/requisitos/INDEX.md).`);
}

const git = spawnSync("git", ["status", "--short", "--branch"], { cwd: projectDir, encoding: "utf8" });
if (git.status === 0) out.push("git status:\n" + (git.stdout.trim().split("\n").slice(0, 15).join("\n") || "(limpio)"));

process.stdout.write(out.join("\n\n") + "\n");
