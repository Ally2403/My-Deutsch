// PreToolUse (Write | Edit | MultiEdit): evita escribir secretos en archivos versionados.
import { basename } from "node:path";
import { readInput, deny } from "./lib.mjs";

const input = readInput();
const ti = input.tool_input ?? {};
const file = String(ti.file_path ?? "");
const name = basename(file);
const text = [ti.content, ti.new_string, ...(ti.edits ?? []).map((e) => e.new_string)]
  .filter(Boolean)
  .join("\n");

// Los .env reales nunca los escribe Claude: la usuaria los llena a mano.
if (/^\.env(\..+)?$/.test(name) && !/\.example$|\.sample$|\.template$/.test(name)) {
  deny(`No escribas ${name}: contiene secretos. Actualiza .env.example y pide a la usuaria que copie los valores.`);
}

const PATTERNS = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/, "clave de Anthropic"],
  [/\bsk-[A-Za-z0-9]{32,}/, "clave de API tipo sk-"],
  [/AIza[0-9A-Za-z_-]{35}/, "clave de Google API"],
  [/GOCSPX-[A-Za-z0-9_-]{20,}/, "secreto de cliente OAuth de Google"],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "llave privada"],
  [/eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,}/, "JWT (posible service_role de Supabase)"],
  [/(SERVICE_ROLE|SECRET|PASSWORD)[A-Z_]*\s*[:=]\s*["']?[A-Za-z0-9+/_.-]{24,}/, "secreto asignado en código"],
];
for (const [re, label] of PATTERNS) {
  if (re.test(text)) {
    deny(`Bloqueado por guard-secrets: parece una ${label} en ${name}. Usa variables de entorno (process.env / os.environ) y .env.example con valores vacíos.`);
  }
}

process.exit(0);
