// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf-8");

function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}

const light = tokens(css.match(/:root\s*\{([^}]*)\}/)![1]);
const dark = tokens(css.match(/prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/)![1]);

describe("contrastRatio (WCAG 2.x)", () => {
  it("negro sobre blanco es 21 y es simétrico", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
  });
  it("texto del tema claro sobre blanco ≥ 15", () => {
    expect(contrastRatio("#171717", "#ffffff")).toBeGreaterThanOrEqual(15);
  });
});

describe("tokens de género (RNF-09 c1)", () => {
  for (const g of ["gender-m", "gender-n", "gender-f", "gender-none"]) {
    it(`${g} ≥ 4.5:1 en tema claro`, () => {
      expect(contrastRatio(light[g], light.background)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${g} ≥ 4.5:1 en tema oscuro`, () => {
      expect(contrastRatio(dark[g], dark.background)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("resaltado de sustantivos (RF-26 c2)", () => {
  it("la opacidad definida es ≤ 0.35", () => {
    const alpha = Number(css.match(/--highlight-alpha:\s*([\d.]+)/)![1]);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThanOrEqual(0.35);
  });
  it("cada género tiene un borde inferior distinto", () => {
    expect(css).toMatch(/\.hl-m[^}]*border-bottom:[^;]*solid/);
    expect(css).toMatch(/\.hl-n[^}]*border-bottom:[^;]*dotted/);
    expect(css).toMatch(/\.hl-f[^}]*border-bottom:[^;]*double/);
  });
});
