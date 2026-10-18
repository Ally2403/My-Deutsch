import { describe, expect, it } from "vitest";
import {
  groupErrorMessage,
  inviteLink,
  isValidInviteCode,
  normalizeInviteCode,
  validateGroupName,
} from "./group";

describe("validateGroupName (RF-06)", () => {
  it("acepta de 3 a 60 caracteres", () => {
    expect(validateGroupName("abc")).toBeNull();
    expect(validateGroupName("a".repeat(60))).toBeNull();
  });
  it("rechaza menos de 3 o más de 60, sin contar espacios de los bordes", () => {
    expect(validateGroupName("  ab  ")).not.toBeNull();
    expect(validateGroupName("a".repeat(61))).not.toBeNull();
  });
});

describe("códigos de invitación (RN-09)", () => {
  it("normaliza minúsculas, espacios y guiones", () => {
    expect(normalizeInviteCode(" abcd-2345 ")).toBe("ABCD2345");
  });
  it("rechaza caracteres ambiguos y longitudes incorrectas", () => {
    expect(isValidInviteCode("ABCD2345")).toBe(true);
    expect(isValidInviteCode("ABCD0345")).toBe(false);
    expect(isValidInviteCode("ABCD1345")).toBe(false);
    expect(isValidInviteCode("ABCDI345")).toBe(false);
    expect(isValidInviteCode("ABC")).toBe(false);
  });
  it("arma el enlace de invitación", () => {
    expect(inviteLink("https://x.app", "ABCD2345")).toBe(
      "https://x.app/unirse/ABCD2345",
    );
  });
});

describe("groupErrorMessage (RF-07)", () => {
  it("traduce los errores conocidos", () => {
    expect(groupErrorMessage({ message: "invalid_code" })).toBe(
      "Código no válido",
    );
    expect(groupErrorMessage({ message: "group_full" })).toBe(
      "El grupo está lleno",
    );
  });
  it("avisa del límite de intentos (RNF-17)", () => {
    expect(groupErrorMessage({ message: "too_many_attempts" })).toBe(
      "Demasiados intentos, inténtalo más tarde",
    );
  });
  it("usa un mensaje genérico para el resto", () => {
    expect(groupErrorMessage({ message: "otra cosa" })).toMatch(/No pudimos/);
  });
});
