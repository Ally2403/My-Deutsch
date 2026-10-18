import { afterEach, describe, expect, it, vi } from "vitest";
import { createLoaders } from "./book-reader";

const ID = "11111111-1111-4111-8111-111111111111";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(res: {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
}) {
  const f = vi.fn().mockResolvedValue(res);
  vi.stubGlobal("fetch", f);
  return f;
}

const validPage = {
  v: 1,
  size: [1000, 1400],
  lines: [],
  paragraphs: [],
  tokens: [],
  lex: {},
};

describe("createLoaders", () => {
  it("loadPage pide exactamente la ruta de datos", async () => {
    const f = stubFetch({ ok: true, status: 200, json: async () => validPage });
    const page = await createLoaders(ID).loadPage(3);
    expect(f).toHaveBeenCalledWith(`/api/libros/${ID}/paginas/3/datos`);
    expect(page.size).toEqual([1000, 1400]);
  });
  it("404 -> página aún en proceso", async () => {
    stubFetch({ ok: false, status: 404 });
    await expect(createLoaders(ID).loadPage(2)).rejects.toThrow(
      "Esta página aún se está procesando",
    );
  });
  it("otros errores -> mensaje genérico", async () => {
    stubFetch({ ok: false, status: 500 });
    await expect(createLoaders(ID).loadPage(2)).rejects.toThrow(
      "No se pudo cargar la página 2",
    );
  });
  it("página inválida -> mensaje genérico (parsePage puede citar valores crudos)", async () => {
    stubFetch({ ok: true, status: 200, json: async () => ({ v: 2 }) });
    await expect(createLoaders(ID).loadPage(1)).rejects.toThrow(
      "No se pudo cargar la página 1",
    );
  });
  it("fetch caído en red -> español, sin el mensaje nativo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    const err = await createLoaders(ID)
      .loadPage(4)
      .catch((e: Error) => e);
    expect((err as Error).message).toBe("No se pudo cargar la página 4");
  });
  it("respuesta 200 con HTML -> sin fragmentos de la respuesta", async () => {
    stubFetch({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError(
          `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`,
        );
      },
    });
    const err = await createLoaders(ID)
      .loadPage(5)
      .catch((e: Error) => e);
    expect((err as Error).message).toBe("No se pudo cargar la página 5");
    expect((err as Error).message).not.toContain("DOCTYPE");
  });
  it("imageUrl", () => {
    expect(createLoaders(ID).imageUrl(2)).toBe(
      `/api/libros/${ID}/paginas/2/imagen`,
    );
  });
});
