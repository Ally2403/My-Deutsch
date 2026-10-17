import { describe, expect, it } from "vitest";
import { safeNext } from "./redirect";

describe("safeNext", () => {
  it("acepta rutas internas", () => {
    expect(safeNext("/grupos/abc?x=1")).toBe("/grupos/abc?x=1");
  });
  it("rechaza destinos externos o ambiguos", () => {
    expect(safeNext("https://malo.com")).toBe("/grupos");
    expect(safeNext("//malo.com")).toBe("/grupos");
    expect(safeNext("/\\malo.com")).toBe("/grupos");
    expect(safeNext(null)).toBe("/grupos");
  });
  it("rechaza caracteres de control que el navegador ignora", () => {
    expect(safeNext("/\t/malo.com")).toBe("/grupos");
    expect(safeNext("/\n/malo.com")).toBe("/grupos");
    expect(safeNext("/\r/malo.com")).toBe("/grupos");
  });
  it("devuelve la ruta normalizada del mismo origen", () => {
    expect(safeNext("/a/../grupos?x=1#h")).toBe("/grupos?x=1#h");
  });
});
