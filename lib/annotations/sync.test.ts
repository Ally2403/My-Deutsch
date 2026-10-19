import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Annotation } from "@/lib/domain/annotation";
import { createAnnotationSync, type Remote, type Store } from "./sync";

const ann = (id: string, page = 1, text = "hola"): Annotation => ({
  id,
  page,
  x: 0.2,
  y: 0.3,
  text,
  kind: "free",
});

function memStore(): Store & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async (k) => data.get(k),
    set: async (k, v) => void data.set(k, structuredClone(v)),
  };
}

let remote: { [K in keyof Remote]: ReturnType<typeof vi.fn> };
let store: ReturnType<typeof memStore>;
const make = () => createAnnotationSync({ store, remote: remote as unknown as Remote, debounceMs: 500 });

beforeEach(() => {
  vi.useFakeTimers();
  store = memStore();
  remote = {
    load: vi.fn(async () => []),
    upsert: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    clearPage: vi.fn(async () => {}),
  };
});

describe("createAnnotationSync (RF-33 c2, RNF-14)", () => {
  it("lo escrito se lee y se guarda en local al instante, antes de llegar al servidor", async () => {
    const s = make();
    await s.upsert(ann("a"));
    expect(await s.get(1)).toEqual([ann("a")]);
    expect(remote.upsert).not.toHaveBeenCalled();
    expect(store.data.get("page:1")).toEqual([ann("a")]);
  });

  it("agrupa varias ediciones y envía solo la última en menos de 1 s", async () => {
    const s = make();
    await s.upsert(ann("a", 1, "h"));
    await s.upsert(ann("a", 1, "ho"));
    await s.upsert(ann("a", 1, "hola"));
    await vi.advanceTimersByTimeAsync(600);
    expect(remote.upsert).toHaveBeenCalledTimes(1);
    expect(remote.upsert).toHaveBeenCalledWith(ann("a", 1, "hola"));
    expect(s.status()).toBe("saved");
  });

  it("flush envía de inmediato (cambiar de página antes de 1 s no pierde nada)", async () => {
    const s = make();
    await s.upsert(ann("a"));
    await s.flush();
    expect(remote.upsert).toHaveBeenCalledTimes(1);
  });

  it("sin conexión queda pendiente y se envía al reconectar, incluso tras recargar", async () => {
    remote.upsert.mockRejectedValue(new Error("offline"));
    const s = make();
    await s.upsert(ann("a"));
    await s.flush();
    expect(s.status()).toBe("offline");

    remote.upsert.mockResolvedValue(undefined);
    const reloaded = make();
    expect(await reloaded.get(1)).toEqual([ann("a")]);
    await reloaded.flush();
    expect(remote.upsert).toHaveBeenLastCalledWith(ann("a"));
    expect(reloaded.status()).toBe("saved");
  });

  it("borrar una anotación la quita en local y en el servidor", async () => {
    const s = make();
    await s.upsert(ann("a"));
    await s.remove("a", 1);
    await s.flush();
    expect(await s.get(1)).toEqual([]);
    expect(remote.remove).toHaveBeenCalledWith("a");
    expect(remote.upsert).not.toHaveBeenCalled();
  });

  it("reiniciar una página borra solo las de esa página (RF-35)", async () => {
    const s = make();
    await s.upsert(ann("a", 1));
    await s.upsert(ann("b", 2));
    await s.clearPage(1);
    await s.flush();
    expect(await s.get(1)).toEqual([]);
    expect(await s.get(2)).toEqual([ann("b", 2)]);
    expect(remote.clearPage).toHaveBeenCalledWith(1);
  });

  it("al cargar una página sin pendientes adopta lo del servidor", async () => {
    remote.load.mockResolvedValue([ann("z", 3)]);
    const s = make();
    expect(await s.load(3)).toEqual([ann("z", 3)]);
    expect(store.data.get("page:3")).toEqual([ann("z", 3)]);
  });

  it("al cargar con pendientes conserva lo local", async () => {
    remote.upsert.mockRejectedValue(new Error("offline"));
    remote.load.mockResolvedValue([]);
    const s = make();
    await s.upsert(ann("a", 1));
    await s.flush();
    expect(await s.load(1)).toEqual([ann("a", 1)]);
  });

  it("lo escrito mientras llega la respuesta del servidor no se pierde", async () => {
    let release!: (v: Annotation[]) => void;
    remote.load.mockReturnValue(new Promise((r) => (release = r)));
    const s = make();
    const loading = s.load(1);
    await s.upsert(ann("a"));
    release([]);
    expect(await loading).toEqual([ann("a")]);
    expect(await s.get(1)).toEqual([ann("a")]);
  });
});
