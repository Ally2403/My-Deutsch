import { describe, expect, it } from "vitest";
import type { PageData } from "./page";
import {
  seenMarksFor,
  seenSummary,
  withLookup,
  type SeenWord,
} from "./seen-words";

const b: [number, number, number, number] = [0.1, 0.1, 0.1, 0.02];
const page = {
  v: 1,
  size: [1600, 2263],
  lines: [[0, 2]],
  paragraphs: [[0, 2]],
  images: [],
  fields: [],
  tokens: [
    { t: "Er", b },
    { t: "geht", b, l: 5 },
    { t: "Haus", b, l: 9 },
  ],
  lex: {},
} as unknown as PageData;

const seen = (o: Partial<SeenWord> = {}): SeenWord => ({
  status: "seen",
  lookups: 1,
  bookId: null,
  page: null,
  ...o,
});

describe("palabras ya vistas (RF-28)", () => {
  it("marca solo los tokens cuyo lema está en el diccionario", () => {
    const marks = seenMarksFor(
      page,
      new Map([
        [5, seen()],
        [77, seen()],
      ]),
    );
    expect([...marks]).toEqual([[1, "seen"]]);
  });

  it("distingue «conocida» de «vista»", () => {
    const marks = seenMarksFor(page, new Map([[9, seen({ status: "known" })]]));
    expect(marks.get(2)).toBe("known");
  });

  it("withLookup crea la entrada o suma una consulta sin mutar el mapa", () => {
    const base = new Map<number, SeenWord>();
    const a = withLookup(base, 5, { bookId: "b", page: 3 });
    expect(base.size).toBe(0);
    expect(a.get(5)).toEqual({
      status: "seen",
      lookups: 1,
      bookId: "b",
      page: 3,
    });
    const c = withLookup(a, 5, { bookId: "x", page: 9 });
    expect(c.get(5)).toEqual({
      status: "seen",
      lookups: 2,
      bookId: "b",
      page: 3,
    });
  });

  it("el resumen del panel aparece desde la segunda consulta", () => {
    expect(seenSummary(undefined, undefined)).toBeNull();
    expect(seenSummary(seen({ lookups: 1 }), "Libro")).toBeNull();
    expect(
      seenSummary(seen({ lookups: 3, bookId: "b", page: 12 }), "Der Schatz"),
    ).toBe("La viste 3 veces · primera vez en Der Schatz, pág. 12");
    expect(seenSummary(seen({ lookups: 2 }), undefined)).toBe(
      "La viste 2 veces",
    );
    expect(
      seenSummary(seen({ lookups: 2, bookId: "b", page: 4 }), undefined),
    ).toContain("otro libro");
  });
});
