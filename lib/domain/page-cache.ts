/**
 * Caché LRU de páginas con deduplicación de peticiones en vuelo (RNF-19).
 * Un error de red no se guarda: el siguiente `get` vuelve a pedir la página.
 */
export type PageCache<T> = {
  get: (n: number) => Promise<T>;
  prefetch: (ns: number[]) => void;
};

export function createPageCache<T>(
  fetchPage: (n: number) => Promise<T>,
  max = 5,
): PageCache<T> {
  const entries = new Map<number, Promise<T>>();

  function get(n: number): Promise<T> {
    const hit = entries.get(n);
    if (hit) {
      // Marca como la más reciente.
      entries.delete(n);
      entries.set(n, hit);
      return hit;
    }
    const p = fetchPage(n);
    entries.set(n, p);
    p.catch(() => {
      if (entries.get(n) === p) entries.delete(n);
    });
    while (entries.size > max) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
    return p;
  }

  return {
    get,
    prefetch(ns) {
      for (const n of ns) get(n).catch(() => {});
    },
  };
}
