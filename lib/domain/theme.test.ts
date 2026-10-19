// @vitest-environment node
import { describe, expect, it } from "vitest";
import { THEME_INIT_SCRIPT, THEME_KEY, nextTheme, parseTheme } from "./theme";

describe("tema (RF-44)", () => {
  it("valores desconocidos o ausentes son «Sistema»", () => {
    expect(parseTheme(null)).toBe("system");
    expect(parseTheme("rojo")).toBe("system");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
  });
  it("el selector recorre Sistema → Claro → Oscuro → Sistema", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });
  it("el script inicial lee la misma clave que guarda el selector", () => {
    expect(THEME_INIT_SCRIPT).toContain(THEME_KEY);
  });
});
