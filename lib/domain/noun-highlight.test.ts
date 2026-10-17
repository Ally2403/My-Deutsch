import { describe, expect, it } from "vitest";
import { highlightFor } from "./noun-highlight";
import type { PageData } from "./page";

const b = [0.1, 0.1, 0.05, 0.02] as const;

const page: PageData = {
  v: 1,
  size: [1600, 2263],
  lines: [[0, 6]],
  paragraphs: [[0, 6]],
  images: [],
  fields: [],
  tokens: [
    { t: "Tisch", b, l: 1 },
    { t: "Haus", b, l: 2 },
    { t: "Lampe", b, l: 3 },
    { t: "Berlin", b, l: 4 },
    { t: "Leute", b, l: 5 },
    { t: "geht", b, l: 6 },
    { t: "und", b },
  ],
  lex: {
    "1": { lemma: "Tisch", pos: "noun", g: ["m"], senses: [] },
    "2": { lemma: "Haus", pos: "noun", g: ["n"], senses: [] },
    "3": { lemma: "Lampe", pos: "noun", g: ["f"], senses: [] },
    "4": { lemma: "Berlin", pos: "propn", senses: [] },
    "5": { lemma: "Leute", pos: "noun", g: [], senses: [] },
    "6": { lemma: "gehen", pos: "verb", senses: [] },
  },
};

describe("highlightFor (RF-26, RN-01)", () => {
  it("devuelve el género de cada sustantivo con género conocido", () => {
    const map = highlightFor(page);
    expect([...map.entries()]).toEqual([
      [0, "m"],
      [1, "n"],
      [2, "f"],
    ]);
  });
  it("excluye nombres propios, solo plurales, verbos y palabras sin entrada", () => {
    const map = highlightFor(page);
    for (const i of [3, 4, 5, 6]) expect(map.has(i)).toBe(false);
  });
  it("con varios géneros usa el primero (RN-01)", () => {
    const p = { ...page, lex: { ...page.lex, "1": { lemma: "Teil", pos: "noun", g: ["n", "m"] as ("n" | "m")[], senses: [] } } };
    expect(highlightFor(p).get(0)).toBe("n");
  });
});
