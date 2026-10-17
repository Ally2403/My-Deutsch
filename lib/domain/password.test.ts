import { describe, expect, it } from "vitest";
import { validatePassword } from "./password";

describe("validatePassword (RF-01)", () => {
  it("acepta 8+ caracteres con letra y número", () => {
    expect(validatePassword("abcd1234")).toBeNull();
  });
  it("rechaza menos de 8 caracteres", () => {
    expect(validatePassword("ab1")).toBe(
      "La contraseña debe tener al menos 8 caracteres.",
    );
  });
  it("exige una letra", () => {
    expect(validatePassword("12345678")).toBe(
      "La contraseña debe incluir al menos una letra.",
    );
  });
  it("exige un número", () => {
    expect(validatePassword("abcdefgh")).toBe(
      "La contraseña debe incluir al menos un número.",
    );
  });
});
