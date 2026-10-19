import { describe, expect, it } from "vitest";
import { MAX_TEXT, clampRel, pointToRel, sanitizeText } from "./annotation";

describe("annotation (RF-33, RN-13)", () => {
  it("convierte un toque en coordenadas relativas 0–1 a la página", () => {
    const rect = { left: 100, top: 50, width: 400, height: 800 };
    expect(pointToRel(300, 450, rect)).toEqual({ x: 0.5, y: 0.5 });
  });
  it("el mismo punto relativo da lo mismo en pantallas de distinto tamaño", () => {
    const a = pointToRel(10 + 90, 20 + 200, { left: 10, top: 20, width: 180, height: 400 });
    const b = pointToRel(360, 800, { left: 0, top: 0, width: 720, height: 1600 });
    expect(a).toEqual(b);
  });
  it("recorta a 0–1 los toques fuera de la página", () => {
    expect(clampRel(-0.2)).toBe(0);
    expect(clampRel(1.4)).toBe(1);
    expect(clampRel(Number.NaN)).toBe(0);
  });
  it("limita el texto a la longitud permitida por la base de datos", () => {
    expect(sanitizeText("x".repeat(MAX_TEXT + 5))).toHaveLength(MAX_TEXT);
  });
});
