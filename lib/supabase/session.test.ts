// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
const claims = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => ({
        data: claims.value ? { claims: claims.value } : null,
      }),
    },
  }),
}));

import { isPublicPath, updateSession } from "./session";

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
    expect(isPublicPath("/lector/local")).toBe(true); // solo existe en desarrollo (404 en producción)
    expect(isPublicPath("/lector")).toBe(false);
    expect(isPublicPath("/lector/demoX")).toBe(false);
  });

  it("el repaso de ejemplo es público, el repaso real no (RF-48)", () => {
    expect(isPublicPath("/repaso/demo")).toBe(true);
    expect(isPublicPath("/repaso")).toBe(false);
  });

  it("las rutas de grupos siguen siendo privadas (RN-03)", () => {
    expect(isPublicPath("/grupos")).toBe(false);
    expect(isPublicPath("/grupos/abc")).toBe(false);
  });
});

// RF-02, RN-03: sin sesión, las páginas redirigen a /login y la API responde 401 JSON
// (un fetch que siguiera la redirección tomaría el HTML de /login como respuesta válida).
describe("updateSession sin sesión", () => {
  const req = (path: string) => new NextRequest(`http://localhost${path}`);

  it("API sin claims: 401 JSON not_authenticated", async () => {
    claims.value = null;
    const res = await updateSession(req("/api/libros/finalizar"));
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "not_authenticated" });
  });

  it("página privada sin claims: 307 a /login con next", async () => {
    claims.value = null;
    const res = await updateSession(req("/grupos/abc"));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("next")).toBe("/grupos/abc");
  });

  it("API con claims: pasa", async () => {
    claims.value = { sub: "u1" };
    const res = await updateSession(req("/api/libros/finalizar"));
    expect(res.status).toBe(200);
  });
});
