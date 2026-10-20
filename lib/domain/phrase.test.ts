import { describe, expect, it } from "vitest";
import { parsePage, type PageData } from "./page";
import {
  canTranslatePhrase,
  glossesFor,
  phraseText,
  sentencesCovering,
  tokenRangeFromSelection,
} from "./phrase";

const tk = (t: string, extra: object = {}) => ({
  t,
  b: [0.1, 0.1, 0.05, 0.01],
  ...extra,
});

function makePage(withSents = true): PageData {
  return parsePage({
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
      tk("Der"),
      tk("Tisch", { l: 1 }),
      tk("steht", { l: 2 }),
      tk("hier."),
      tk("Normalerweise", { l: 3, b2: [0.1, 0.2, 0.05, 0.01] }),
      tk("regnet", { l: 4 }),
      tk("es"),
      tk("nicht."),
    ],
    lex: {
      "1": {
        lemma: "Tisch",
        pos: "noun",
        g: ["m"],
        senses: [{ es: "mesa", m: false }],
      },
      "2": {
        lemma: "stehen",
        pos: "verb",
        senses: [{ es: "estar de pie", m: false }],
      },
      "3": {
        lemma: "normalerweise",
        pos: "adv",
        senses: [{ es: "normalmente", m: true }],
      },
      "4": { lemma: "regnen", pos: "verb", senses: [] },
    },
    ...(withSents
      ? {
          sents: [
            { r: [0, 3], es: "La mesa está aquí." },
            { r: [4, 7], es: "Normalmente no llueve." },
          ],
        }
      : {}),
  });
}

describe("tokenRangeFromSelection", () => {
  it("ordena una selección invertida e incluye ambos extremos", () => {
    expect(tokenRangeFromSelection(8, 3)).toEqual([3, 8]);
    expect(tokenRangeFromSelection(3, 8)).toEqual([3, 8]);
    expect(tokenRangeFromSelection(5, 5)).toEqual([5, 5]);
  });
});

describe("canTranslatePhrase", () => {
  it("una sola palabra no abre el panel de frase", () => {
    expect(canTranslatePhrase([4, 4])).toBe(false);
    expect(canTranslatePhrase([4, 5])).toBe(true);
  });
});

describe("phraseText", () => {
  it("une con espacio, cruza el salto de línea y respeta la palabra con b2", () => {
    expect(phraseText(makePage(), [2, 5])).toBe(
      "steht hier. Normalerweise regnet",
    );
  });
  it("recorta los extremos fuera de la página", () => {
    expect(phraseText(makePage(), [-3, 1])).toBe("Der Tisch");
    expect(phraseText(makePage(), [6, 99])).toBe("es nicht.");
    expect(phraseText(makePage(), [20, 30])).toBe("");
  });
});

describe("sentencesCovering", () => {
  it("devuelve una oración si la selección está dentro de una", () => {
    expect(sentencesCovering(makePage(), [1, 2])).toEqual([
      {
        range: [0, 3],
        text: "Der Tisch steht hier.",
        es: "La mesa está aquí.",
      },
    ]);
  });
  it("una selección que cruza dos oraciones devuelve dos", () => {
    const out = sentencesCovering(makePage(), [2, 5]);
    expect(out.map((s) => s.es)).toEqual([
      "La mesa está aquí.",
      "Normalmente no llueve.",
    ]);
  });
  it("sin sents la traducción es null y el texto es la selección", () => {
    expect(sentencesCovering(makePage(false), [1, 2])).toEqual([
      { range: [1, 2], text: "Tisch steht", es: null },
    ]);
  });
  it("recorta los extremos y no falla fuera de la página", () => {
    expect(sentencesCovering(makePage(), [-5, 1])).toHaveLength(1);
    expect(sentencesCovering(makePage(), [50, 60])).toEqual([]);
  });
});

describe("glossesFor", () => {
  it("da el primer sentido de las palabras con entrada y salta las demás", () => {
    const out = glossesFor(makePage(), [0, 5]);
    expect(out.map((g) => [g.token, g.form, g.lemma, g.es])).toEqual([
      [1, "Tisch", "Tisch", "mesa"],
      [2, "steht", "stehen", "estar de pie"],
      [4, "Normalerweise", "normalerweise", "normalmente"],
    ]);
    expect(out[0].genders).toEqual(["m"]);
  });
  it("quita la puntuación pegada a la forma", () => {
    const page = makePage();
    page.tokens[3] = { ...page.tokens[3], t: "«Tisch»,", l: 1 };
    expect(glossesFor(page, [3, 3])[0].form).toBe("Tisch");
  });
});
