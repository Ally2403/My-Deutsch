import type { Annotation } from "@/lib/domain/annotation";
import type { Remote } from "./sync";

const KEY = "md-demo-remote-annotations";

/** «Servidor» de la demo: guarda en localStorage y falla sin conexión, para probar RNF-14 sin sesión. */
export function createDemoRemote(): Remote {
  const read = (): Annotation[] => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Annotation[];
    } catch {
      return [];
    }
  };
  const write = (list: Annotation[]) => {
    if (!navigator.onLine) throw new Error("sin conexión");
    localStorage.setItem(KEY, JSON.stringify(list));
  };
  return {
    async load(page) {
      if (!navigator.onLine) throw new Error("sin conexión");
      return read().filter((a) => a.page === page);
    },
    async upsert(a) {
      write([...read().filter((x) => x.id !== a.id), a]);
    },
    async remove(id) {
      write(read().filter((x) => x.id !== id));
    },
    async clearPage(page) {
      write(read().filter((x) => x.page !== page));
    },
  };
}
