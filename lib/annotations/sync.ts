import { sanitizeText, type Annotation } from "@/lib/domain/annotation";

export type SyncStatus = "saved" | "saving" | "offline";

export type Store = {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
};

export type Remote = {
  load(page: number): Promise<Annotation[]>;
  upsert(a: Annotation): Promise<void>;
  remove(id: string): Promise<void>;
  clearPage(page: number): Promise<void>;
};

type Op =
  | { type: "upsert"; a: Annotation }
  | { type: "remove"; id: string }
  | { type: "clear"; page: number };

const PENDING = "pending";
const pageKey = (p: number) => `page:${p}`;

/**
 * RNF-14: primero se guarda en local (IndexedDB), luego se sincroniza con retraso corto;
 * lo pendiente sobrevive a recargas y se reintenta con `flush` (evento `online`, cambio de página).
 */
export function createAnnotationSync({
  store,
  remote,
  debounceMs = 500,
}: {
  store: Store;
  remote: Remote;
  debounceMs?: number;
}) {
  let pending: Op[] | null = null;
  let writes = 0; // cuenta de escrituras locales, para detectar cambios durante una carga
  let current: SyncStatus = "saved";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let flushing: Promise<void> | null = null;
  const listeners = new Set<(s: SyncStatus) => void>();

  const setStatus = (s: SyncStatus) => {
    if (s === current) return;
    current = s;
    listeners.forEach((l) => l(s));
  };

  async function ops(): Promise<Op[]> {
    if (!pending) {
      const saved = await store.get(PENDING).catch(() => undefined);
      pending = Array.isArray(saved) ? (saved as Op[]) : [];
      if (pending.length) setStatus("offline");
    }
    return pending;
  }
  const persistOps = async () => {
    await store.set(PENDING, pending ?? []).catch(() => {});
  };
  async function getPage(page: number): Promise<Annotation[]> {
    const v = await store.get(pageKey(page)).catch(() => undefined);
    return Array.isArray(v) ? (v as Annotation[]) : [];
  }

  function schedule() {
    setStatus("saving");
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void api.flush(), debounceMs);
  }

  async function enqueue(op: Op) {
    const list = await ops();
    const same = (o: Op) =>
      op.type === "upsert" && o.type === "upsert"
        ? o.a.id === op.a.id
        : op.type === "remove" && o.type === "upsert"
          ? o.a.id === op.id
          : false;
    if (op.type === "clear") {
      // un reinicio hace innecesario lo pendiente de esa página
      pending = list.filter((o) =>
        o.type === "upsert" ? o.a.page !== op.page : true,
      );
    } else {
      pending = list.filter((o) => !same(o));
    }
    pending.push(op);
    await persistOps();
    schedule();
  }

  const api = {
    status: () => current,
    onStatus(fn: (s: SyncStatus) => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    get: getPage,
    /** Lectura local primero; adopta lo del servidor solo si no hay cambios pendientes. */
    async load(page: number): Promise<Annotation[]> {
      const list = await ops();
      if (list.length) return getPage(page);
      try {
        const seen = writes;
        const fresh = await remote.load(page);
        // algo se escribió mientras llegaba la respuesta: lo local manda
        if (writes !== seen || (await ops()).length) return getPage(page);
        await store.set(pageKey(page), fresh).catch(() => {});
        return fresh;
      } catch {
        return getPage(page);
      }
    },
    async upsert(a: Annotation) {
      writes++;
      const clean = { ...a, text: sanitizeText(a.text) };
      const list = await getPage(a.page);
      const next = list.some((x) => x.id === a.id)
        ? list.map((x) => (x.id === a.id ? clean : x))
        : [...list, clean];
      await store.set(pageKey(a.page), next);
      await enqueue({ type: "upsert", a: clean });
    },
    async remove(id: string, page: number) {
      writes++;
      await store.set(
        pageKey(page),
        (await getPage(page)).filter((x) => x.id !== id),
      );
      await enqueue({ type: "remove", id });
    },
    /** RF-35: borra solo las anotaciones propias de la página. */
    async clearPage(page: number) {
      writes++;
      await store.set(pageKey(page), []);
      await enqueue({ type: "clear", page });
    },
    flush(): Promise<void> {
      if (timer) clearTimeout(timer);
      timer = null;
      if (flushing) return flushing;
      flushing = (async () => {
        const list = await ops();
        setStatus(list.length ? "saving" : "saved");
        while (list.length > 0) {
          const op = list[0];
          try {
            if (op.type === "upsert") await remote.upsert(op.a);
            else if (op.type === "remove") await remote.remove(op.id);
            else await remote.clearPage(op.page);
          } catch {
            setStatus("offline");
            return;
          }
          list.shift();
          await persistOps();
        }
        setStatus("saved");
      })().finally(() => {
        flushing = null;
      });
      return flushing;
    },
  };
  return api;
}

export type AnnotationSync = ReturnType<typeof createAnnotationSync>;
