import { describe, expect, it } from "vitest";
import { parsePage } from "./page";

const valid = () => ({
  v: 1,
  size: [1600, 2263],
  lines: [[0, 1]],
  paragraphs: [[0, 1]],
  images: [[0.08, 0.55, 0.84, 0.3]],
  fields: [],
  tokens: [
    { t: "Häuser", b: [0.112, 0.081, 0.064, 0.018], l: 431, c: 0.97 },
    { t: "ging", b: [0.3, 0.12, 0.04, 0.018], l: 902, f: "pret" },
  ],
  lex: {
    "431": {
      lemma: "Haus",
      pos: "noun",
      g: ["n"],
      pl: "Häuser",
      senses: [{ es: "casa", m: false }],
    },
    "902": { lemma: "gehen", pos: "verb", senses: [{ es: "ir", m: true }] },
  },
});

describe("parsePage (formato del JSON de página)", () => {
  it("acepta una página válida", () => {
    const page = parsePage(valid());
    expect(page.tokens).toHaveLength(2);
    expect(page.lex["431"].lemma).toBe("Haus");
  });

  it("acepta una página sin tokens", () => {
    const raw = { ...valid(), tokens: [], lines: [], paragraphs: [], lex: {} };
    expect(parsePage(raw).tokens).toEqual([]);
  });

  it("rechaza una versión distinta de 1", () => {
    expect(() => parsePage({ ...valid(), v: 2 })).toThrow(
      "versión no soportada",
    );
  });

  it("rechaza una caja con valores fuera de 0–1", () => {
    const raw = valid();
    raw.tokens[0].b = [0.1, 0.1, 1.2, 0.02];
    expect(() => parsePage(raw)).toThrow("caja");
    const neg = valid();
    neg.tokens[0].b = [-0.1, 0.1, 0.1, 0.02];
    expect(() => parsePage(neg)).toThrow("caja");
  });

  it("rechaza un token cuyo id de léxico no está en lex", () => {
    const raw = valid();
    raw.tokens[0].l = 9;
    expect(() => parsePage(raw)).toThrow("léxico");
  });

  it("rechaza una entrada con más de 5 acepciones", () => {
    const raw = valid();
    raw.lex["431"].senses = Array.from({ length: 6 }, (_, i) => ({
      es: `s${i}`,
      m: false,
    }));
    expect(() => parsePage(raw)).toThrow("acepciones");
  });

  it("rechaza líneas o párrafos con índices fuera de los tokens", () => {
    expect(() => parsePage({ ...valid(), lines: [[0, 5]] })).toThrow("índice");
    expect(() => parsePage({ ...valid(), paragraphs: [[1, 0]] })).toThrow(
      "índice",
    );
  });

  it("rechaza sep fuera de rango", () => {
    const raw = valid() as ReturnType<typeof valid> & {
      tokens: { sep?: number }[];
    };
    raw.tokens[0].sep = 7;
    expect(() => parsePage(raw)).toThrow("sep");
  });

  it("rechaza una forma f desconocida", () => {
    const raw = valid();
    raw.tokens[1].f = "xyz";
    expect(() => parsePage(raw)).toThrow("forma");
  });
});
