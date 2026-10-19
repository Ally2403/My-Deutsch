import { describe, expect, it } from "vitest";
import {
  countBy,
  filterWords,
  filtersFromParams,
  filtersToParams,
  matchesSearch,
  normalizeA,
  normalizeB,
  sortWords,
  type DictWord,
} from "./dictionary";

const w = (o: Partial<DictWord> & { lemma: string }): DictWord => ({
  lexiconId: 1,
  pos: "noun",
  genders: [],
  plural: null,
  glosses: [],
  status: "seen",
  lookups: 1,
  bookId: null,
  page: null,
  sentence: null,
  firstSeenAt: "2026-10-01T00:00:00Z",
  lastSeenAt: "2026-10-01T00:00:00Z",
  ...o,
});

describe("normalización de búsqueda (RF-30 c2)", () => {
  it("ß=ss, ä=ae, ö=oe, ü=ue y sin distinguir mayúsculas", () => {
    expect(normalizeA("Straße")).toBe("strasse");
    expect(normalizeA("Mädchen")).toBe("maedchen");
    expect(normalizeA("Über")).toBe("ueber");
  });
  it("normalizeB quita tildes y diéresis", () => {
    expect(normalizeB("Mädchen")).toBe("madchen");
    expect(normalizeB("camión")).toBe("camion");
    expect(normalizeB("Straße")).toBe("strasse");
  });
  it("coincidencias parciales en lema o significado", () => {
    const x = w({ lemma: "Mädchen", glosses: ["niña", "muchacha"] });
    expect(matchesSearch(x, "maedch")).toBe(true);
    expect(matchesSearch(x, "madch")).toBe(true);
    expect(matchesSearch(x, "NINA")).toBe(true);
    expect(matchesSearch(x, "chacha")).toBe(true);
    expect(matchesSearch(x, "perro")).toBe(false);
    expect(matchesSearch(w({ lemma: "Straße" }), "strasse")).toBe(true);
    expect(matchesSearch(w({ lemma: "Strasse" }), "straße")).toBe(true);
    expect(matchesSearch(x, "  ")).toBe(true);
  });
});

describe("filtros y orden (RF-31)", () => {
  const words = [
    w({ lexiconId: 1, lemma: "Frau", genders: ["f"], bookId: "A", lookups: 5 }),
    w({
      lexiconId: 2,
      lemma: "Haus",
      genders: ["n"],
      bookId: "A",
      status: "known",
    }),
    w({ lexiconId: 3, lemma: "gehen", pos: "verb", bookId: "B", lookups: 9 }),
    w({
      lexiconId: 4,
      lemma: "Tisch",
      genders: ["m"],
      bookId: "B",
      firstSeenAt: "2026-10-05T00:00:00Z",
    }),
    w({ lexiconId: 5, lemma: "schnell", pos: "adj" }),
    w({ lexiconId: 6, lemma: "schon", pos: "adv" }),
    w({ lexiconId: 7, lemma: "auf", pos: "prep" }),
  ];
  const base = { q: "", pos: null, gender: null, status: null, bookId: null };

  it("los filtros se combinan", () => {
    const r = filterWords(words, {
      ...base,
      pos: "noun",
      gender: "f",
      status: "seen",
      bookId: "A",
    });
    expect(r.map((x) => x.lemma)).toEqual(["Frau"]);
  });
  it("«otros» agrupa lo que no es sustantivo, verbo, adjetivo ni adverbio", () => {
    expect(
      filterWords(words, { ...base, pos: "other" }).map((x) => x.lemma),
    ).toEqual(["auf"]);
  });
  it("cuenta por cada valor de un filtro respetando los demás", () => {
    const c = countBy(words, { ...base, status: "seen" }, "pos");
    expect(c.noun).toBe(2);
    expect(c.verb).toBe(1);
    expect(c.other).toBe(1);
    const g = countBy(words, base, "gender");
    expect(g).toMatchObject({ m: 1, f: 1, n: 1 });
  });
  it("ordena por fecha, alfabéticamente y por consultas", () => {
    expect(sortWords(words, "recent")[0].lemma).toBe("Tisch");
    expect(
      sortWords(words, "alpha")
        .map((x) => x.lemma)
        .slice(0, 3),
    ).toEqual(["auf", "Frau", "gehen"]);
    expect(sortWords(words, "lookups")[0].lemma).toBe("gehen");
  });
});

describe("filtros en la URL (RF-31 c3)", () => {
  it("ida y vuelta, ignorando valores no válidos", () => {
    const f = {
      q: "haus",
      pos: "noun",
      gender: "f",
      status: "known",
      bookId: "abc",
      order: "alpha",
    } as const;
    const params = filtersToParams(f);
    expect(filtersFromParams(params)).toEqual(f);
    expect(
      filtersToParams({
        q: "",
        pos: null,
        gender: null,
        status: null,
        bookId: null,
        order: "recent",
      }).toString(),
    ).toBe("");
    const bad = filtersFromParams(
      new URLSearchParams("tipo=zzz&genero=x&estado=q&orden=raro"),
    );
    expect(bad).toEqual({
      q: "",
      pos: null,
      gender: null,
      status: null,
      bookId: null,
      order: "recent",
    });
  });
});
