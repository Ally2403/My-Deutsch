import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// RF-50: la lógica de ruteo del service worker es pura y se prueba sin navegador.
const sw = createRequire(import.meta.url)("../../public/sw.js") as {
  routeFor: (
    url: string,
    method: string,
    opts?: { mode?: string; origin?: string; rsc?: boolean },
  ) => "static" | "pages" | "navigate" | "network-only";
  isCacheableNavigation: (pathname: string) => boolean;
  dataCacheName: (version: string, userId: string) => string;
  isDataCache: (name: string) => boolean;
  SW_VERSION: string;
};
const O = "https://app.test";
const route = (path: string, method = "GET", opts = {}) =>
  sw.routeFor(O + path, method, { origin: O, ...opts });
const BOOK = "0b1e2d3c-1111-4222-8333-444455556666";

describe("routeFor", () => {
  it("estáticos con caché primero", () => {
    expect(route("/_next/static/chunks/a.js")).toBe("static");
    expect(route("/icons/icon-192.png")).toBe("static");
    expect(route("/demo/page-1.json")).toBe("static");
  });
  it("navegaciones con red primero", () => {
    expect(route("/grupos", "GET", { mode: "navigate" })).toBe("navigate");
    expect(route("/offline", "GET", { mode: "navigate" })).toBe("navigate");
  });
  it("imágenes y JSON de páginas de libros", () => {
    expect(route(`/api/libros/${BOOK}/paginas/3/imagen`)).toBe("pages");
    expect(route(`/api/libros/${BOOK}/paginas/3/datos`)).toBe("pages");
  });
  it("todo lo demás solo red", () => {
    expect(route("/auth/signout", "POST")).toBe("network-only");
    expect(route("/auth/callback")).toBe("network-only");
    expect(route("/auth/callback", "GET", { mode: "navigate" })).toBe(
      "network-only",
    );
    expect(route("/api/cuenta/eliminar", "POST")).toBe("network-only");
    expect(route("/api/cuenta/eliminar")).toBe("network-only");
    expect(route("/api/libros/finalizar", "POST")).toBe("network-only");
    expect(route(`/api/libros/${BOOK}/reintentar`, "POST")).toBe(
      "network-only",
    );
    expect(route(`/api/libros/${BOOK}/paginas/3/datos`, "POST")).toBe(
      "network-only",
    );
    expect(route("/grupos?_rsc=abc", "GET", { rsc: true })).toBe(
      "network-only",
    );
  });
  it("Supabase y otros orígenes: solo red", () => {
    for (const u of [
      "https://x.supabase.co/rest/v1/user_words",
      "https://x.supabase.co/auth/v1/token",
      "https://x.supabase.co/storage/v1/object/pages/a.webp",
    ]) {
      expect(sw.routeFor(u, "GET", { origin: O })).toBe("network-only");
      expect(sw.routeFor(u, "GET", { origin: O, mode: "navigate" })).toBe(
        "network-only",
      );
    }
  });
  it("una ruta de página con id o número raros no se cachea", () => {
    expect(route("/api/libros/xx/paginas/3/datos")).toBe("network-only");
    expect(route(`/api/libros/${BOOK}/paginas/abc/imagen`)).toBe(
      "network-only",
    );
  });
});

describe("cachés", () => {
  it("solo se guardan navegaciones del lector y la demo", () => {
    expect(sw.isCacheableNavigation("/lector/demo")).toBe(true);
    expect(sw.isCacheableNavigation(`/libros/${BOOK}`)).toBe(true);
    expect(sw.isCacheableNavigation("/perfil")).toBe(false);
    expect(sw.isCacheableNavigation("/grupos")).toBe(false);
    expect(sw.isCacheableNavigation("/auth/callback")).toBe(false);
  });
  it("el caché de datos lleva la versión y la usuaria", () => {
    const a = sw.dataCacheName("v1", "user-a");
    const b = sw.dataCacheName("v1", "user-b");
    expect(a).not.toBe(b);
    expect(sw.isDataCache(a)).toBe(true);
    expect(sw.isDataCache("md-static-v1")).toBe(false);
  });
});
