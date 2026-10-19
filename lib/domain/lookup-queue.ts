import type { Lookup } from "./lookup-log";

export type QueueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const MAX_PENDING = 200;

/**
 * RF-27 c3: cola de consultas pendientes. Se persiste en el almacenamiento del navegador y se
 * vacía en orden; si un envío falla (sin red) la consulta se conserva para el siguiente intento.
 */
export function createLookupQueue({
  send,
  storage,
  key,
}: {
  send: (lookup: Lookup) => Promise<void>;
  storage: QueueStorage;
  key: string;
}) {
  let items: Lookup[] | null = null;
  let flushing: Promise<void> | null = null;

  function load(): Lookup[] {
    if (items) return items;
    try {
      const parsed: unknown = JSON.parse(storage.getItem(key) ?? "[]");
      items = Array.isArray(parsed) ? (parsed as Lookup[]).slice(-MAX_PENDING) : [];
    } catch {
      items = [];
    }
    return items;
  }

  function persist() {
    try {
      storage.setItem(key, JSON.stringify(load()));
    } catch {
      /* sin almacenamiento: la cola sigue en memoria */
    }
  }

  return {
    size: () => load().length,
    enqueue(lookup: Lookup) {
      const list = load();
      list.push(lookup);
      if (list.length > MAX_PENDING) list.splice(0, list.length - MAX_PENDING);
      persist();
    },
    flush(): Promise<void> {
      if (flushing) return flushing;
      flushing = (async () => {
        const list = load();
        while (list.length > 0) {
          try {
            await send(list[0]);
          } catch {
            break;
          }
          list.shift();
          persist();
        }
      })().finally(() => {
        flushing = null;
      });
      return flushing;
    },
  };
}
