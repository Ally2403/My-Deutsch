import { describe, expect, it } from "vitest";
import {
  EDGE_GUARD_PX,
  clampPage,
  keyDirection,
  parsePageInput,
  prefetchTargets,
  swipeDirection,
} from "./paging";

describe("clampPage", () => {
  it("limita a 1..total y redondea", () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(9, 3)).toBe(3);
    expect(clampPage(2.6, 3)).toBe(3);
    expect(clampPage(Number.NaN, 3)).toBe(1);
  });
});

describe("parsePageInput", () => {
  it("acepta enteros dentro del rango", () => {
    expect(parsePageInput("2", 3)).toBe(2);
    expect(parsePageInput(" 3 ", 3)).toBe(3);
  });
  it("rechaza lo que está fuera de rango o no es entero", () => {
    expect(parsePageInput("0", 3)).toBeNull();
    expect(parsePageInput("4", 3)).toBeNull();
    expect(parsePageInput("1.5", 3)).toBeNull();
    expect(parsePageInput("", 3)).toBeNull();
    expect(parsePageInput("abc", 3)).toBeNull();
  });
});

describe("swipeDirection (RF-16 c1)", () => {
  const base = { startX: 200, dx: -80, dy: 5, width: 360 };
  it("dx negativo → next, positivo → prev", () => {
    expect(swipeDirection(base)).toBe("next");
    expect(swipeDirection({ ...base, dx: 80 })).toBe("prev");
  });
  it("ignora gestos que empiezan en la zona de 24 px del borde", () => {
    expect(EDGE_GUARD_PX).toBe(24);
    expect(swipeDirection({ ...base, startX: 23, dx: 80 })).toBeNull();
    expect(swipeDirection({ ...base, startX: 24, dx: 80 })).toBe("prev");
    expect(swipeDirection({ ...base, startX: 337, dx: -80 })).toBeNull();
    expect(swipeDirection({ ...base, startX: 336, dx: -80 })).toBe("next");
  });
  it("ignora desplazamientos cortos o más verticales que horizontales", () => {
    expect(swipeDirection({ ...base, dx: -49 })).toBeNull();
    expect(swipeDirection({ ...base, dx: -60, dy: 90 })).toBeNull();
  });
});

describe("keyDirection (RF-16 c2)", () => {
  it("mapea flechas y AvPág/RePág", () => {
    expect(keyDirection("ArrowRight")).toBe("next");
    expect(keyDirection("PageDown")).toBe("next");
    expect(keyDirection("ArrowLeft")).toBe("prev");
    expect(keyDirection("PageUp")).toBe("prev");
    expect(keyDirection("Enter")).toBeNull();
  });
});

describe("prefetchTargets (RF-16 c4)", () => {
  it("devuelve las vecinas que existen", () => {
    expect(prefetchTargets(1, 3)).toEqual([2]);
    expect(prefetchTargets(2, 3)).toEqual([3, 1]);
    expect(prefetchTargets(3, 3)).toEqual([2]);
    expect(prefetchTargets(1, 1)).toEqual([]);
  });
});
