import { describe, expect, it } from "vitest";
import { newCard, previewIntervals, schedule } from "./review";

const NOW = new Date("2026-10-20T15:00:00Z");

describe("RF-48 schedule (FSRS)", () => {
  it("«Bien» a una tarjeta nueva da due futuro y reps = 1", () => {
    const { card, log } = schedule(newCard(NOW), 3, NOW);
    expect(card.due.getTime()).toBeGreaterThan(NOW.getTime());
    expect(card.reps).toBe(1);
    expect(card.state).toBe(2);
    expect(log.rating).toBe(3);
    expect(log.stateBefore).toBe(0);
    expect(log.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("«Otra vez» tras repasar sube lapses", () => {
    const first = schedule(newCard(NOW), 3, NOW).card;
    const later = new Date(NOW.getTime() + first.scheduledDays * 86_400_000);
    const failed = schedule(first, 1, later);
    expect(failed.card.lapses).toBe(1);
    expect(failed.log.stateBefore).toBe(2);
  });

  it("«Fácil» programa más lejos que «Difícil»", () => {
    const hard = schedule(newCard(NOW), 2, NOW).card.due.getTime();
    const easy = schedule(newCard(NOW), 4, NOW).card.due.getTime();
    expect(easy).toBeGreaterThan(hard);
  });

  it("cada reseña genera un id distinto", () => {
    const a = schedule(newCard(NOW), 3, NOW).log.id;
    const b = schedule(newCard(NOW), 3, NOW).log.id;
    expect(a).not.toBe(b);
  });

  it("previewIntervals da un texto por calificación", () => {
    const p = previewIntervals(newCard(NOW), NOW);
    expect(Object.keys(p)).toEqual(["1", "2", "3", "4"]);
    for (const v of Object.values(p))
      expect(v).toMatch(/^\d+ (min|h|d|mes|a)$/);
  });
});
