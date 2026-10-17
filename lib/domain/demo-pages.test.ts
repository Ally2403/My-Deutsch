// @vitest-environment node
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePage } from "./page";

const dir = join(process.cwd(), "public", "demo");
const load = (n: number) =>
  parsePage(JSON.parse(readFileSync(join(dir, `page-${n}.json`), "utf-8")));

describe("ejemplo de prueba (3 páginas sintéticas)", () => {
  it("las 3 páginas pasan parsePage", () => {
    for (const n of [1, 2, 3]) expect(() => load(n)).not.toThrow();
  });

  it("las imágenes pesan ≤ 250 KB", () => {
    for (const n of [1, 2, 3]) {
      expect(statSync(join(dir, `page-${n}.webp`)).size).toBeLessThanOrEqual(
        250 * 1024,
      );
    }
  });

  it("la página 1 tiene un sustantivo de cada género y un nombre propio", () => {
    const p = load(1);
    const genders = new Set(
      Object.values(p.lex).flatMap((e) =>
        e.pos === "noun" ? (e.g ?? []) : [],
      ),
    );
    expect([...genders].sort()).toEqual(["f", "m", "n"]);
    expect(Object.values(p.lex).some((e) => e.pos === "propn")).toBe(true);
    expect(Object.values(p.lex).some((e) => e.pl)).toBe(true);
  });

  it("la página 2 tiene verbo separable, forma, varios géneros, solo plural y palabra con guion", () => {
    const p = load(2);
    expect(p.tokens.some((t) => t.sep !== undefined)).toBe(true);
    expect(p.tokens.some((t) => t.f === "pret")).toBe(true);
    expect(p.tokens.some((t) => t.b2 !== undefined)).toBe(true);
    const nouns = Object.values(p.lex).filter((e) => e.pos === "noun");
    expect(nouns.some((e) => (e.g ?? []).length > 1)).toBe(true);
    expect(nouns.some((e) => (e.g ?? []).length === 0)).toBe(true);
  });

  it("la página 3 no tiene tokens", () => {
    expect(load(3).tokens).toHaveLength(0);
  });
});
