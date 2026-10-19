import { describe, expect, it } from "vitest";
import { isDeleteConfirmed, parseLevel, validateDisplayName } from "./profile";

describe("perfil (RF-05)", () => {
  it("el nombre visible lleva entre 2 y 60 caracteres", () => {
    expect(validateDisplayName("Al")).toBeNull();
    expect(validateDisplayName("  A  ")).toMatch(/al menos 2/);
    expect(validateDisplayName("x".repeat(61))).toMatch(/60/);
    expect(validateDisplayName("x".repeat(60))).toBeNull();
  });

  it("el nivel es uno de A1–C2 o ninguno", () => {
    expect(parseLevel("B1")).toBe("B1");
    expect(parseLevel("D1")).toBeNull();
    expect(parseLevel("")).toBeNull();
    expect(parseLevel(undefined)).toBeNull();
  });

  it("eliminar la cuenta exige escribir ELIMINAR", () => {
    expect(isDeleteConfirmed("ELIMINAR")).toBe(true);
    expect(isDeleteConfirmed(" eliminar ")).toBe(true);
    expect(isDeleteConfirmed("eliminar cuenta")).toBe(false);
    expect(isDeleteConfirmed("")).toBe(false);
  });
});
