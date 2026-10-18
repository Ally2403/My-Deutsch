// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const BOOK = "0b7e5a52-3c1d-4f0a-9d63-2f1c8a4e7b10";
const IMAGE_PATH = "books/secret-image-path/p1.webp";
const TOKENS_PATH = "books/secret-tokens-path/p1.json";

const h = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  row: null as { image_path: string; tokens_path: string } | null,
  rowError: null as unknown,
  download: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  bucketFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from: (table: string) => {
      h.from(table);
      const q = {
        select: () => q,
        eq: (col: string, val: unknown) => {
          h.eq(col, val);
          return q;
        },
        maybeSingle: async () => ({ data: h.row, error: h.rowError }),
      };
      return q;
    },
    storage: {
      from: (bucket: string) => {
        h.bucketFrom(bucket);
        return { download: h.download };
      },
    },
  }),
}));

import { GET as getDatos } from "./datos/route";
import { GET as getImagen } from "./imagen/route";

const routes = [
  ["datos", getDatos, "application/json", TOKENS_PATH],
  ["imagen", getImagen, "image/webp", IMAGE_PATH],
] as const;

const call = (get: typeof getDatos, id: string, n: string) =>
  get(new Request("http://localhost/x") as never, { params: Promise.resolve({ id, n }) });

beforeEach(() => {
  h.user = { id: "u1" };
  h.row = { image_path: IMAGE_PATH, tokens_path: TOKENS_PATH };
  h.rowError = null;
  h.download.mockReset();
  h.eq.mockReset();
  h.from.mockReset();
  h.bucketFrom.mockReset();
  h.download.mockImplementation(async () => ({ data: new Blob(["{\"ok\":1}"]), error: null }));
});

describe.each(routes)("GET /api/libros/[id]/paginas/[n]/%s", (_name, get, type, objectPath) => {
  it.each(["0", "401", "abc", "1.5", "01", "-1", "", "1e2", " 1", "999999999999"])(
    "n=%j inválido: 400 sin tocar la base",
    async (n) => {
      const r = await call(get, BOOK, n);
      expect(r.status).toBe(400);
      expect(h.from).not.toHaveBeenCalled();
      expect(h.download).not.toHaveBeenCalled();
    },
  );

  it.each(["1", "9", "10", "400"])("n=%s válido no da 400", async (n) => {
    expect((await call(get, BOOK, n)).status).toBe(200);
  });

  it("id que no es UUID: 400 sin tocar la base", async () => {
    const r = await call(get, "nope", "1");
    expect(r.status).toBe(400);
    expect(h.from).not.toHaveBeenCalled();
  });

  it("sin sesión: 401 sin tocar la base", async () => {
    h.user = null;
    const r = await call(get, BOOK, "1");
    expect(r.status).toBe(401);
    expect(h.from).not.toHaveBeenCalled();
    expect(h.download).not.toHaveBeenCalled();
  });

  it("fila inexistente o invisible por RLS: 404 y no descarga", async () => {
    h.row = null;
    const r = await call(get, BOOK, "1");
    expect(r.status).toBe(404);
    expect(h.download).not.toHaveBeenCalled();
  });

  it("consulta pages por book_id y number y descarga la ruta de la fila", async () => {
    const r = await call(get, BOOK, "7");
    expect(r.status).toBe(200);
    expect(h.from).toHaveBeenCalledWith("pages");
    expect(h.eq).toHaveBeenCalledWith("book_id", BOOK);
    expect(h.eq).toHaveBeenCalledWith("number", 7);
    expect(h.bucketFrom).toHaveBeenCalledWith("pages");
    expect(h.download).toHaveBeenCalledWith(objectPath);
  });

  it("200 con las cabeceras exactas", async () => {
    const r = await call(get, BOOK, "1");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe(type);
    expect(r.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(await r.text()).toBe('{"ok":1}');
  });

  it("objeto faltante en Storage (404/400): 404", async () => {
    for (const status of [404, 400]) {
      h.download.mockResolvedValue({ data: null, error: { status, message: "Object not found" } });
      expect((await call(get, BOOK, "1")).status).toBe(404);
    }
  });

  it("otro error de Storage: 500 genérico sin texto crudo ni rutas", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.download.mockResolvedValue({ data: null, error: { status: 503, message: "bucket pages boom" } });
    const r = await call(get, BOOK, "1");
    expect(r.status).toBe(500);
    const text = await r.text();
    expect(JSON.parse(text)).toEqual({ error: "unexpected" });
    expect(text).not.toContain("boom");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("boom");
    spy.mockRestore();
  });

  it("error de la base: 500 genérico sin texto de Postgres", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.row = null;
    h.rowError = { message: 'relation "secret_table" does not exist', code: "42P01" };
    const r = await call(get, BOOK, "1");
    expect(r.status).toBe(500);
    const text = await r.text();
    expect(text).not.toContain("secret_table");
    spy.mockRestore();
  });

  it("los cuerpos de error no contienen rutas de Storage", async () => {
    h.download.mockResolvedValue({ data: null, error: { status: 404, message: "x" } });
    const text = await (await call(get, BOOK, "1")).text();
    expect(text).not.toContain(IMAGE_PATH);
    expect(text).not.toContain(TOKENS_PATH);
  });
});
