import { describe, expect, it } from "vitest";
import {
  baseWidth,
  clampZoom,
  distance,
  doubleTapZoom,
  pinchZoom,
  swipeChangesPage,
  wheelZoom,
} from "./zoom";

describe("zoom del lector (RF-19)", () => {
  it("el pellizco amplía hasta 4× y no baja de 1×", () => {
    expect(pinchZoom(1, 100, 200)).toBe(2);
    expect(pinchZoom(1, 100, 900)).toBe(4);
    expect(pinchZoom(2, 100, 10)).toBe(1);
    expect(pinchZoom(2, 0, 50)).toBe(2);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it("el doble toque alterna entre ajustada y 2×", () => {
    expect(doubleTapZoom(1)).toBe(2);
    expect(doubleTapZoom(2)).toBe(1);
    expect(doubleTapZoom(3.5)).toBe(1);
  });

  it("con zoom, deslizar no cambia de página", () => {
    expect(swipeChangesPage(1)).toBe(true);
    expect(swipeChangesPage(1.5)).toBe(false);
  });

  it("la rueda con Ctrl acerca con deltaY negativo y aleja con positivo", () => {
    expect(wheelZoom(1, -50)).toBeGreaterThan(1);
    expect(wheelZoom(2, 50)).toBeLessThan(2);
    expect(wheelZoom(1, 100)).toBe(1);
    expect(wheelZoom(3.9, -500)).toBe(4);
  });

  it("ajustar al ancho usa el ancho (con tope) y al alto usa el alto disponible", () => {
    const base = { viewport: { w: 360, h: 400 }, aspect: 1600 / 2263 };
    expect(baseWidth({ ...base, fit: "width" })).toBe(360);
    expect(baseWidth({ ...base, fit: "height" })).toBeCloseTo(400 * (1600 / 2263), 5);
    expect(baseWidth({ fit: "width", viewport: { w: 1600, h: 900 }, aspect: 0.7 })).toBe(900);
    // Pantalla ancha y baja: al alto nunca supera el ancho.
    expect(baseWidth({ fit: "height", viewport: { w: 300, h: 2000 }, aspect: 0.7 })).toBe(300);
  });

  it("distance mide entre dos puntos", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
