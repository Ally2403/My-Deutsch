import { describe, expect, it } from "vitest";
import { genderInfo } from "./gender";

describe("genderInfo (RN-01)", () => {
  it("colorea según el género del lema", () => {
    expect(genderInfo({ pos: "noun", genders: ["n"] })).toEqual({
      kind: "colored",
      gender: "n",
      article: "das",
      multiple: false,
      articles: ["das"],
    });
  });

  it("usa la primera acepción cuando hay varios géneros y lo indica", () => {
    const info = genderInfo({ pos: "noun", genders: ["m", "n"] });
    expect(info).toMatchObject({ kind: "colored", gender: "m", multiple: true });
    expect(info.kind === "colored" && info.articles).toEqual(["der", "das"]);
  });

  it("un sustantivo sin género es solo plural y va en gris", () => {
    expect(genderInfo({ pos: "noun", genders: [] })).toEqual({ kind: "plural-only" });
  });

  it("no colorea nombres propios ni otras categorías", () => {
    expect(genderInfo({ pos: "propn", genders: ["f"] })).toEqual({ kind: "none" });
    expect(genderInfo({ pos: "verb", genders: [] })).toEqual({ kind: "none" });
  });

  it("ignora géneros desconocidos", () => {
    expect(genderInfo({ pos: "noun", genders: ["x", "f"] })).toMatchObject({ gender: "f" });
  });
});
