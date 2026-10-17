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
});
