import { describe, expect, it } from "vitest";
import type { PageData } from "./page";
import {
  entryFor,
  formLabel,
  pairOf,
  plainText,
  posLabel,
  sentenceOf,
} from "./page-lookup";

const b = [0.1, 0.1, 0.05, 0.02] as const;

// "Er ruft sie an." / "Die Häuser sind alt." (dos líneas, un párrafo)
const page: PageData = {
  v: 1,
  size: [1600, 2263],
  lines: [
    [0, 3],
    [4, 7],
  ],
  paragraphs: [[0, 7]],
  images: [],
  fields: [],
  tokens: [
    { t: "Er", b },
    { t: "ruft", b, l: 902, sep: 3 },
    { t: "sie", b },
    { t: "an.", b, sep: 1 },
    { t: "Die", b },
    { t: "Häuser", b, l: 431, f: "pl" },
    { t: "sind", b },
    { t: "alt.", b },
  ],
  lex: {
    "431": {
      lemma: "Haus",
      pos: "noun",
      g: ["n"],
      pl: "Häuser",
      senses: [{ es: "casa", m: false }],
    },
    "902": {
      lemma: "anrufen",
      pos: "verb",
      senses: [{ es: "llamar", m: false }],
    },
  },
};

describe("entryFor", () => {
  it("devuelve la entrada de léxico del token", () => {
    expect(entryFor(page, 5)?.lemma).toBe("Haus");
  });
  it("devuelve null si el token no tiene l", () => {
    expect(entryFor(page, 0)).toBeNull();
  });
  it("devuelve null si el índice no existe", () => {
    expect(entryFor(page, 99)).toBeNull();
  });
});

describe("sentenceOf (oración para RN-05)", () => {
  it("devuelve la oración que contiene al token", () => {
    expect(sentenceOf(page, 1)).toBe("Er ruft sie an.");
    expect(sentenceOf(page, 5)).toBe("Die Häuser sind alt.");
  });
  it("la oración puede cruzar líneas dentro del párrafo", () => {
    const p: PageData = {
      ...page,
      tokens: page.tokens.map((t, i) => (i === 3 ? { ...t, t: "an" } : t)),
    };
    expect(sentenceOf(p, 0)).toBe("Er ruft sie an Die Häuser sind alt.");
  });
  it("devuelve cadena vacía si el índice no existe", () => {
    expect(sentenceOf(page, 99)).toBe("");
  });
});

describe("pairOf (RN-07)", () => {
  it("es simétrica entre verbo y partícula", () => {
    expect(pairOf(page, 1)).toBe(3);
    expect(pairOf(page, 3)).toBe(1);
  });
  it("devuelve null sin pareja", () => {
    expect(pairOf(page, 0)).toBeNull();
  });
});

describe("etiquetas en español", () => {
  it("formLabel", () => {
    expect(formLabel("pret")).toBe("pretérito");
    expect(formLabel("part")).toBe("participio");
    expect(formLabel("pl")).toBe("plural");
    expect(formLabel(undefined)).toBeNull();
  });
  it("posLabel", () => {
    expect(posLabel("noun")).toBe("sustantivo");
    expect(posLabel("verb")).toBe("verbo");
    expect(posLabel("adj")).toBe("adjetivo");
    expect(posLabel("zzz")).toBe("palabra");
  });
});

describe("plainText (RF-17 c2)", () => {
  it("conserva espacios entre palabras y un salto por línea", () => {
    expect(plainText(page)).toBe("Er ruft sie an.\nDie Häuser sind alt.");
  });
  it("devuelve cadena vacía sin tokens", () => {
    expect(plainText({ ...page, tokens: [], lines: [], paragraphs: [] })).toBe(
      "",
    );
  });
});
