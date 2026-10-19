import type { Store } from "./sync";

/** RNF-14 c2: almacén local en IndexedDB; si no está disponible, memoria (la sesión sigue funcionando). */
export function createIdbStore(name: string): Store {
  const mem = new Map<string, unknown>();
  let dbPromise: Promise<IDBDatabase> | null = null;
  const open = () =>
    (dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === "undefined") return reject(new Error("sin IndexedDB"));
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction("kv", mode).objectStore("kv"));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };
  return {
    async get(key) {
      try {
        return await run("readonly", (s) => s.get(key));
      } catch {
        return mem.get(key);
      }
    },
    async set(key, value) {
      mem.set(key, value);
      try {
        await run("readwrite", (s) => s.put(value, key));
      } catch {
        /* queda en memoria */
      }
    },
  };
}
