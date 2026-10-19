import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";
import { securityHeaders } from "./security-headers";

describe("cabeceras de seguridad (RNF-05)", () => {
  it("incluye HSTS con al menos un año", () => {
    const hsts = securityHeaders.find(
      (h) => h.key === "Strict-Transport-Security",
    );
    expect(hsts).toBeDefined();
    const maxAge = Number(/max-age=(\d+)/.exec(hsts!.value)?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
  });

  it("evita el sniffing de tipos y el embebido en marcos", () => {
    const get = (k: string) => securityHeaders.find((h) => h.key === k)?.value;
    expect(get("X-Content-Type-Options")).toBe("nosniff");
    expect(get("X-Frame-Options")).toBe("DENY");
  });

  it("next.config las aplica a todas las rutas", async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((r) => r.source === "/(.*)");
    expect(all?.headers).toEqual(securityHeaders);
  });
});
