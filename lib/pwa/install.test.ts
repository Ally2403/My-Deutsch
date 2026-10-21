import { describe, expect, it } from "vitest";
import { installMode, isIos } from "./install";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/120.0 Mobile Safari/537.36";
const base = {
  userAgent: ANDROID,
  maxTouchPoints: 5,
  standalone: false,
  hasPrompt: false,
};

describe("installMode (RF-50 c5)", () => {
  it("instalada: se oculta aunque haya evento o sea iPhone", () => {
    expect(installMode({ ...base, standalone: true, hasPrompt: true })).toBe(
      "installed",
    );
    expect(installMode({ ...base, userAgent: IPHONE, standalone: true })).toBe(
      "installed",
    );
  });
  it("Android/Chrome con evento: botón", () => {
    expect(installMode({ ...base, hasPrompt: true })).toBe("prompt");
  });
  it("iPhone (sin evento): pasos Compartir → Añadir a pantalla de inicio", () => {
    expect(installMode({ ...base, userAgent: IPHONE })).toBe("ios-steps");
  });
  it("iPad que se anuncia como Mac táctil cuenta como iOS; un Mac normal no", () => {
    expect(isIos(IPAD_DESKTOP, 5)).toBe(true);
    expect(isIos(IPAD_DESKTOP, 0)).toBe(false);
  });
  it("sin evento ni iOS: nada que mostrar", () => {
    expect(installMode(base)).toBe("none");
  });
});
