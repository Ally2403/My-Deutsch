import { describe, expect, it } from "vitest";
import { isPublicPath } from "./session";

describe("isPublicPath", () => {
  it("mantiene públicas las rutas de acceso y privacidad", () => {
    for (const p of [
      "/",
      "/privacidad",
      "/login",
      "/registro",
      "/recuperar",
      "/auth/callback",
    ]) {
      expect(isPublicPath(p)).toBe(true);
    }
  });

  it("el ejemplo del lector (contenido sintético) es público, el resto del lector no", () => {
    expect(isPublicPath("/lector/demo")).toBe(true);
    expect(isPublicPath("/lector")).toBe(false);
    expect(isPublicPath("/lector/demoX")).toBe(false);
  });

  it("las rutas de grupos siguen siendo privadas (RN-03)", () => {
    expect(isPublicPath("/grupos")).toBe(false);
    expect(isPublicPath("/grupos/abc")).toBe(false);
  });
});
