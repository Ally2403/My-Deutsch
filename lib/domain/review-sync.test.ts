import { describe, expect, it } from "vitest";
import type { QueueStorage } from "./lookup-queue";
import { newCard, schedule } from "./review";
import {
  createReviewSync,
  type ReviewPayload,
  type ReviewStore,
} from "./review-sync";

const NOW = new Date("2026-10-20T15:00:00Z");

function memory(): QueueStorage & { raw: string | null } {
  return {
    raw: null,
    getItem() {
      return this.raw;
    },
    setItem(_k, v) {
      this.raw = v;
    },
  };
}

/** Simula las tablas: `card_state` por upsert y `review_log` con «on conflict (id) do nothing». */
function fakeStore() {
  const cards = new Map<number, ReviewPayload["card"]>();
  const logs = new Map<string, ReviewPayload["log"]>();
  const state = { offline: false };
  const store: ReviewStore = {
    async save(p) {
      if (state.offline) throw new Error("network");
      cards.set(p.lexiconId, p.card);
      if (!logs.has(p.log.id)) logs.set(p.log.id, p.log);
    },
  };
  return { store, cards, logs, state };
}

describe("RF-48 guardado fiable de reseñas", () => {
  it("enviar la misma reseña dos veces deja una sola fila de historial", async () => {
    const f = fakeStore();
    const sync = createReviewSync({
      store: f.store,
      storage: memory(),
      key: "k",
    });
    const result = { lexiconId: 7, ...schedule(newCard(NOW), 3, NOW) };
    await sync.submit(result);
    await sync.submit(result);
    expect(f.logs.size).toBe(1);
    expect(f.cards.size).toBe(1);
    expect(sync.size()).toBe(0);
  });

  it("sin red se encola y se reenvía al reconectar", async () => {
    const f = fakeStore();
    const storage = memory();
    const sync = createReviewSync({ store: f.store, storage, key: "k" });
    f.state.offline = true;
    await sync.submit({ lexiconId: 1, ...schedule(newCard(NOW), 3, NOW) });
    await sync.submit({ lexiconId: 2, ...schedule(newCard(NOW), 4, NOW) });
    expect(f.logs.size).toBe(0);
    expect(sync.size()).toBe(2);
    expect(JSON.parse(storage.raw ?? "[]")).toHaveLength(2);

    f.state.offline = false;
    await sync.flush();
    expect(f.logs.size).toBe(2);
    expect(sync.size()).toBe(0);
  });

  it("la cola sobrevive a un reinicio (se lee del almacenamiento)", async () => {
    const f = fakeStore();
    const storage = memory();
    f.state.offline = true;
    await createReviewSync({ store: f.store, storage, key: "k" }).submit({
      lexiconId: 1,
      ...schedule(newCard(NOW), 3, NOW),
    });
    f.state.offline = false;
    const again = createReviewSync({ store: f.store, storage, key: "k" });
    expect(again.size()).toBe(1);
    await again.flush();
    expect(f.logs.size).toBe(1);
  });
});
