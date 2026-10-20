import { describe, expect, it } from "vitest";
import {
  PAGE_READ_MS,
  addPageRead,
  percentRead,
  positionPercent,
  progressLabel,
  resumePage,
} from "./progress";

describe("RN-14: progreso de lectura", () => {
  it("una página cuenta como leída tras 10 s", () => {
    expect(PAGE_READ_MS).toBe(10_000);
  });

  it("resumePage abre en la última página guardada, dentro del rango del libro", () => {
    expect(resumePage(7, 20)).toBe(7);
    expect(resumePage(null, 20)).toBe(1);
    expect(resumePage(undefined, 20)).toBe(1);
    expect(resumePage(99, 20)).toBe(20);
    expect(resumePage(0, 20)).toBe(1);
  });

  it("addPageRead agrega sin duplicar y ordena", () => {
    expect(addPageRead([3, 1], 2)).toEqual([1, 2, 3]);
    expect(addPageRead([1, 2], 2)).toEqual([1, 2]);
    expect(addPageRead([], 5)).toEqual([5]);
  });

  it("percentRead cuenta páginas leídas únicas dentro del libro", () => {
    expect(percentRead([], 10)).toBe(0);
    expect(percentRead([1, 2, 3], 10)).toBe(30);
    expect(percentRead([1, 1, 2, 50], 10)).toBe(20);
    expect(percentRead([1], 0)).toBe(0);
    expect(percentRead([1, 2, 3], 3)).toBe(100);
  });
});

describe("RF-49: indicador de avance", () => {
  it("positionPercent es un entero 0–100 y total <= 0 da 0", () => {
    expect(positionPercent(1, 167)).toBe(1);
    expect(positionPercent(167, 167)).toBe(100);
    expect(positionPercent(34, 167)).toBe(20);
    expect(positionPercent(1, 1)).toBe(100);
    expect(positionPercent(5, 0)).toBe(0);
    expect(positionPercent(5, -3)).toBe(0);
    expect(positionPercent(0, 10)).toBe(0);
    expect(positionPercent(99, 10)).toBe(100);
  });

  it("progressLabel arma «Pág. X de Y · Z % leído»", () => {
    const read = Array.from({ length: 33 }, (_, i) => i + 1);
    expect(progressLabel(34, 167, read)).toBe("Pág. 34 de 167 · 20 % leído");
  });

  it("progressLabel ignora duplicados y páginas fuera de rango", () => {
    expect(progressLabel(2, 10, [1, 1, 2, 2, 0, -4, 50])).toBe(
      "Pág. 2 de 10 · 20 % leído",
    );
  });

  it("progressLabel con un libro de una sola página", () => {
    expect(progressLabel(1, 1, [])).toBe("Pág. 1 de 1 · 0 % leído");
    expect(progressLabel(1, 1, [1])).toBe("Pág. 1 de 1 · 100 % leído");
  });
});
