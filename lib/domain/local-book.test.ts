// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePage } from "./page";

const dir = join(process.cwd(), "public", "local-book");
const available = existsSync(join(dir, "manifest.json"));

// Paridad Python → TypeScript: todo JSON que produce el worker debe pasar parsePage.
describe.skipIf(!available)("libro local procesado por el worker", () => {
  const manifest = available ? JSON.parse(readFileSync(join(dir, "manifest.json"), "utf-8")) : null;

  it("cada página JSON pasa parsePage y tiene su imagen WebP", () => {
    for (const p of manifest.pages as { number: number }[]) {
      const raw = JSON.parse(readFileSync(join(dir, "pages", `${p.number}.json`), "utf-8"));
      expect(() => parsePage(raw), `página ${p.number}`).not.toThrow();
      expect(existsSync(join(dir, "pages", `${p.number}.webp`))).toBe(true);
    }
  });

  it("no se publican archivos auxiliares del worker", () => {
    expect(readdirSync(join(dir, "pages")).some((f) => f.includes("meta"))).toBe(false);
  });
});
