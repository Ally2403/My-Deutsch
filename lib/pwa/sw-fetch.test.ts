import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

// RF-50: el manejador `fetch` del service worker, ejecutado con globales simulados.
const O = "https://app.test";
const BOOK = "0b1e2d3c-1111-4222-8333-444455556666";

function loadSw(fetchImpl: () => Promise<Response>) {
  const listeners: Record<string, (e: unknown) => void> = {};
  const store = new Map<string, Map<string, Response>>();
  const key = (k: unknown) => String((k as Request).url ?? k);
  const cacheOf = (n: string) => {
    if (!store.has(n)) store.set(n, new Map());
    const m = store.get(n)!;
    return {
      match: async (k: unknown) => m.get(key(k)),
      put: async (k: unknown, v: Response) => void m.set(key(k), v),
      delete: async (k: unknown) => m.delete(key(k)),
      keys: async () => [...m.keys()].map((u) => ({ url: u })),
    };
  };
  const self = {
    addEventListener: (t: string, f: (e: unknown) => void) => {
      listeners[t] = f;
    },
    location: { origin: O },
    clients: { claim: async () => {} },
  };
  vm.runInNewContext(
    readFileSync(join(process.cwd(), "public/sw.js"), "utf8"),
    {
      self,
      caches: {
        open: async (n: string) => cacheOf(n),
        keys: async () => [...store.keys()],
        delete: async (n: string) => store.delete(n),
      },
      fetch: fetchImpl,
      Response,
      Request,
      URL,
      Error,
      RegExp,
      String,
      Promise,
    },
  );
  return listeners;
}

async function setUser(l: Record<string, (e: unknown) => void>, id: string) {
  let done: Promise<unknown> = Promise.resolve();
  l.message({
    data: { type: "user", id },
    waitUntil: (p: Promise<unknown>) => {
      done = p;
    },
  });
  await done;
}

function pageRequest(l: Record<string, (e: unknown) => void>, tail: string) {
  let responded: Promise<unknown> | undefined;
  l.fetch({
    request: {
      url: `${O}/api/libros/${BOOK}/paginas/1/${tail}`,
      method: "GET",
      mode: "cors",
      headers: new Headers(),
    },
    respondWith: (p: Promise<unknown>) => {
      responded = p;
    },
  });
  return responded;
}

describe("fetch del service worker sin red ni caché", () => {
  const netErr = new TypeError("Failed to fetch");

  it("JSON de página: propaga el error de red (no un ReferenceError)", async () => {
    const l = loadSw(async () => {
      throw netErr;
    });
    await setUser(l, "user-a");
    await expect(pageRequest(l, "datos")).rejects.toBe(netErr);
  });

  it("sin usuaria conocida no guarda ni sirve nada: va directo a la red", async () => {
    const l = loadSw(async () => new Response("x", { status: 200 }));
    const res = (await pageRequest(l, "imagen")) as Response;
    expect(await res.text()).toBe("x");
  });
});
