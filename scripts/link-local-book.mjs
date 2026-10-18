// Copia el libro procesado por el worker (worker/.local/book) a public/local-book/ para
// verlo en /lector/local. Solo desarrollo: public/local-book/ está ignorado por git.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const src = join("worker", ".local", "book");
const dest = join("public", "local-book");
if (!existsSync(join(src, "manifest.json"))) {
  console.error("No hay libro procesado en worker/.local/book (ejecuta el worker primero).");
  process.exit(1);
}
rmSync(dest, { recursive: true, force: true });
mkdirSync(join(dest, "pages"), { recursive: true });
cpSync(join(src, "manifest.json"), join(dest, "manifest.json"));
for (const f of readdirSync(join(src, "pages"))) {
  if (/^\d+\.(json|webp)$/.test(f) && !f.endsWith(".meta.json")) {
    cpSync(join(src, "pages", f), join(dest, "pages", f));
  }
}
console.log(`Libro copiado a ${dest}`);
