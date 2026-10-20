import { describe, expect, it } from "vitest";
import type { DictWord } from "./dictionary";
import {
  buildQueue,
  clozeSentence,
  countDone,
  dueSummary,
  filtersFromParams,
  filtersToParams,
  skipKnown,
  studyDayStart,
} from "./review-queue";
import { newCard, type CardState } from "./review";

const NOW = new Date(2026, 9, 20, 15, 0, 0); // hora local
const LIMITS = { newPerDay: 10, maxReviews: 50 };
const NONE = { new: 0, reviews: 0 };

function word(id: number, over: Partial<DictWord> = {}): DictWord {
  return {
    lexiconId: id,
    lemma: `palabra${id}`,
    pos: "noun",
    genders: ["f"],
    plural: null,
    glosses: ["x"],
    status: "seen",
    lookups: 1,
    bookId: "b1",
    page: 1,
    sentence: null,
    firstSeenAt: new Date(2026, 0, 1, 0, 0, id).toISOString(),
    lastSeenAt: new Date(2026, 0, 1).toISOString(),
    ...over,
  };
}

function card(over: Partial<CardState> = {}): CardState {
  return { ...newCard(NOW), reps: 2, state: 2, ...over };
}

const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

describe("RF-48 buildQueue", () => {
  it("sin tarjetas ni palabras devuelve []", () => {
    expect(buildQueue([], new Map(), {}, NOW, LIMITS, NONE)).toEqual([]);
  });

  it("vencidas primero (por due) y luego nuevas", () => {
    const words = [word(1), word(2), word(3)];
    const cards = new Map([
      [2, card({ due: hoursAgo(1) })],
      [3, card({ due: hoursAgo(5) })],
    ]);
    const q = buildQueue(words, cards, {}, NOW, LIMITS, NONE);
    expect(q.map((i) => i.word.lexiconId)).toEqual([3, 2, 1]);
    expect(q.map((i) => i.isNew)).toEqual([false, false, true]);
  });

  it("una tarjeta que vence más tarde hoy (antes de las 04:00) ya cuenta como vencida", () => {
    const cards = new Map([[1, card({ due: new Date(2026, 9, 20, 22, 0) })]]);
    expect(buildQueue([word(1)], cards, {}, NOW, LIMITS, NONE)).toHaveLength(1);
    const tomorrow = new Map([[1, card({ due: new Date(2026, 9, 21, 9, 0) })]]);
    expect(buildQueue([word(1)], tomorrow, {}, NOW, LIMITS, NONE)).toHaveLength(
      0,
    );
  });

  it("excluye las palabras conocidas", () => {
    const q = buildQueue(
      [word(1, { status: "known" })],
      new Map(),
      {},
      NOW,
      LIMITS,
      NONE,
    );
    expect(q).toEqual([]);
  });

  it("respeta los límites diarios descontando lo hecho hoy", () => {
    const words = Array.from({ length: 30 }, (_, i) => word(i + 1));
    const q = buildQueue(words, new Map(), {}, NOW, LIMITS, {
      new: 4,
      reviews: 0,
    });
    expect(q).toHaveLength(6);
    const cards = new Map(
      words.map((w) => [w.lexiconId, card({ due: hoursAgo(2) })]),
    );
    const r = buildQueue(
      words,
      cards,
      {},
      NOW,
      { newPerDay: 10, maxReviews: 20 },
      {
        new: 0,
        reviews: 15,
      },
    );
    expect(r).toHaveLength(5);
  });

  it("filtra por género, tipo, libro y difíciles", () => {
    const words = [
      word(1, { genders: ["m"] }),
      word(2, { genders: ["f"], bookId: "b2" }),
      word(3, { pos: "verb", genders: [] }),
    ];
    const g = buildQueue(words, new Map(), { gender: "m" }, NOW, LIMITS, NONE);
    expect(g.map((i) => i.word.lexiconId)).toEqual([1]);
    const p = buildQueue(words, new Map(), { pos: "verb" }, NOW, LIMITS, NONE);
    expect(p.map((i) => i.word.lexiconId)).toEqual([3]);
    const b = buildQueue(words, new Map(), { bookId: "b2" }, NOW, LIMITS, NONE);
    expect(b.map((i) => i.word.lexiconId)).toEqual([2]);
    const cards = new Map([
      [1, card({ lapses: 2, due: new Date(2026, 11, 1) })],
      [2, card({ lapses: 1, due: hoursAgo(1) })],
    ]);
    const h = buildQueue(words, cards, { state: "hard" }, NOW, LIMITS, NONE);
    expect(h.map((i) => i.word.lexiconId)).toEqual([1]);
    const n = buildQueue(words, cards, { state: "new" }, NOW, LIMITS, NONE);
    expect(n.map((i) => i.word.lexiconId)).toEqual([3]);
    const d = buildQueue(words, cards, { state: "due" }, NOW, LIMITS, NONE);
    expect(d.map((i) => i.word.lexiconId)).toEqual([2]);
  });

  it("2 500 palabras arman la cola en menos de 50 ms", () => {
    const words = Array.from({ length: 2500 }, (_, i) => word(i + 1));
    const cards = new Map(
      words
        .filter((w) => w.lexiconId % 2 === 0)
        .map((w) => [w.lexiconId, card({ due: hoursAgo(3) })]),
    );
    buildQueue(words, cards, {}, NOW, LIMITS, NONE); // calentamiento
    const t0 = performance.now();
    const q = buildQueue(words, cards, {}, NOW, LIMITS, NONE);
    expect(performance.now() - t0).toBeLessThan(50);
    expect(q).toHaveLength(60);
  });
});

describe("RF-48 día de estudio (04:00 local)", () => {
  it("antes de las 04:00 sigue siendo el día anterior", () => {
    expect(studyDayStart(new Date(2026, 9, 20, 3, 59)).getTime()).toBe(
      new Date(2026, 9, 19, 4, 0).getTime(),
    );
    expect(studyDayStart(new Date(2026, 9, 20, 4, 0)).getTime()).toBe(
      new Date(2026, 9, 20, 4, 0).getTime(),
    );
  });

  it("countDone cuenta lo hecho desde el inicio del día de estudio", () => {
    const logs = [
      { reviewedAt: new Date(2026, 9, 20, 5, 0), stateBefore: 0 },
      { reviewedAt: new Date(2026, 9, 20, 6, 0), stateBefore: 2 },
      { reviewedAt: new Date(2026, 9, 20, 7, 0), stateBefore: 2 },
      { reviewedAt: new Date(2026, 9, 20, 2, 0), stateBefore: 2 }, // día anterior
    ];
    expect(countDone(logs, NOW)).toEqual({ new: 1, reviews: 2 });
  });
});

describe("RF-48 dueSummary", () => {
  it("cuenta vencidas y nuevas con los límites", () => {
    const words = [word(1), word(2), word(3, { status: "known" })];
    const cards = new Map([[1, card({ due: hoursAgo(1) })]]);
    expect(dueSummary(words, cards, NOW, LIMITS, NONE)).toEqual({
      due: 1,
      new: 1,
    });
    expect(dueSummary([], new Map(), NOW, LIMITS, NONE)).toEqual({
      due: 0,
      new: 0,
    });
  });
});

describe("RF-48 filtros en la URL", () => {
  it("ida y vuelta", () => {
    const f = {
      bookId: "b1",
      gender: "m" as const,
      pos: "verb" as const,
      state: "hard" as const,
    };
    expect(filtersFromParams(filtersToParams(f))).toEqual(f);
  });
  it("ignora valores desconocidos", () => {
    expect(
      filtersFromParams(new URLSearchParams("genero=x&tipo=y&estado=z")),
    ).toEqual({});
    expect(filtersToParams({}).toString()).toBe("");
  });
});

describe("RF-48 skipKnown", () => {
  it("una palabra marcada «conocida» a mitad de sesión se salta", () => {
    const q = buildQueue([word(1), word(2)], new Map(), {}, NOW, LIMITS, NONE);
    expect(skipKnown(q, new Set([1])).map((i) => i.word.lexiconId)).toEqual([
      2,
    ]);
  });
});

describe("RF-48 clozeSentence", () => {
  it("oculta la forma conjugada", () => {
    expect(clozeSentence("Er geht nach Hause", "gehen")).toEqual({
      text: "Er _____ nach Hause",
      blanked: true,
    });
  });
  it("oculta el sustantivo con diéresis en el plural", () => {
    expect(clozeSentence("Die Häuser sind alt.", "Haus").text).toBe(
      "Die _____ sind alt.",
    );
  });
  it("sin coincidencia muestra la frase completa", () => {
    expect(clozeSentence("Ich bin müde.", "sein")).toEqual({
      text: "Ich bin müde.",
      blanked: false,
    });
  });
});
