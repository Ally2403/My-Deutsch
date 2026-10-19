import { describe, expect, it } from "vitest";
import { candidates, toLexEntry } from "./lexicon-search";

describe("búsqueda de una forma corregida (RF-25 c2)", () => {
  it("prueba la forma escrita, en minúscula y con mayúscula inicial", () => {
    expect(candidates(" haus ")).toEqual(["haus", "Haus"]);
    expect(candidates("KATZE")).toEqual(["KATZE", "katze", "Katze"]);
    expect(candidates("  ")).toEqual([]);
  });

  it("convierte la fila del léxico y descarta acepciones mal formadas", () => {
    const e = toLexEntry({
      lemma: "Katze",
      pos: "noun",
      genders: ["f", "x"],
      plural: "Katzen",
      senses: [{ es: "gato", m: false }, { m: true }, { es: "gata", m: true }],
    });
    expect(e).toEqual({
      lemma: "Katze",
      pos: "noun",
      g: ["f"],
      pl: "Katzen",
      senses: [
        { es: "gato", m: false },
        { es: "gata", m: true },
      ],
    });
    expect(toLexEntry({ lemma: "x", pos: "noun", genders: [], plural: null, senses: [] })).toBeNull();
  });
});
