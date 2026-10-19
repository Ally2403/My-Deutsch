import { describe, expect, it } from "vitest";
import {
  PAGE_READ_MS,
  addPageRead,
  percentRead,
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
