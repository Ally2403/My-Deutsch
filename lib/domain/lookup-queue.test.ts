import { describe, expect, it, vi } from "vitest";
import type { Lookup } from "./lookup-log";
import { createLookupQueue, type QueueStorage } from "./lookup-queue";

const L = (n: number): Lookup => ({
  lexiconId: n,
  lemma: `w${n}`,
  pos: "noun",
  page: 1,
  sentence: "s",
});

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

describe("cola de consultas (RF-27 c3)", () => {
  it("envía en orden y deja la cola vacía", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const q = createLookupQueue({ send, storage: memory(), key: "k" });
    q.enqueue(L(1));
    q.enqueue(L(2));
    await q.flush();
    expect(send.mock.calls.map((c) => c[0].lexiconId)).toEqual([1, 2]);
    expect(q.size()).toBe(0);
  });

  it("si falla el envío conserva la consulta y la reintenta después", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("sin red"))
      .mockResolvedValue(undefined);
    const storage = memory();
    const q = createLookupQueue({ send, storage, key: "k" });
    q.enqueue(L(1));
    await q.flush();
    expect(q.size()).toBe(1);
    expect(JSON.parse(storage.raw!)).toHaveLength(1);
    await q.flush();
    expect(q.size()).toBe(0);
  });

  it("recupera lo pendiente guardado por una sesión anterior", async () => {
    const storage = memory();
    storage.raw = JSON.stringify([L(7)]);
    const send = vi.fn().mockResolvedValue(undefined);
    const q = createLookupQueue({ send, storage, key: "k" });
    await q.flush();
    expect(send).toHaveBeenCalledWith(L(7));
  });

  it("ignora un almacenamiento dañado y no pasa de 200 pendientes", async () => {
    const storage = memory();
    storage.raw = "{no es json";
    const send = vi.fn().mockRejectedValue(new Error("x"));
    const q = createLookupQueue({ send, storage, key: "k" });
    for (let i = 0; i < 250; i++) q.enqueue(L(i));
    await q.flush();
    expect(q.size()).toBe(200);
  });

  it("dos vaciados simultáneos no envían la misma consulta dos veces", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const q = createLookupQueue({ send, storage: memory(), key: "k" });
    q.enqueue(L(1));
    await Promise.all([q.flush(), q.flush()]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
