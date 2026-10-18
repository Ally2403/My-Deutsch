// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const BOOK = "0b7e5a52-3c1d-4f0a-9d63-2f1c8a4e7b10";
const JOB = "22222222-2222-4222-8222-222222222222";

const h = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  rpc: vi.fn(),
  dispatch: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    rpc: h.rpc,
  }),
}));
vi.mock("@/lib/server/github-dispatch", async (orig) => {
  const real = await orig<typeof import("@/lib/server/github-dispatch")>();
  return { ...real, dispatchProcessBook: h.dispatch };
});

import { DispatchError } from "@/lib/server/github-dispatch";
import { POST } from "./route";

const call = (id: string) =>
  POST(
    new Request(`http://localhost/api/libros/${id}/reintentar`, { method: "POST" }) as never,
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  h.user = { id: "u1" };
  h.rpc.mockReset();
  h.rpc.mockResolvedValue({ data: { book_id: BOOK, job_id: JOB }, error: null });
  h.dispatch.mockReset();
  h.dispatch.mockResolvedValue(undefined);
});

describe("POST /api/libros/[id]/reintentar", () => {
  it("sin sesión: 401 y no llama a la RPC", async () => {
    h.user = null;
    const r = await call(BOOK);
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "not_authenticated" });
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("id que no es UUID: 400 y no llama a la RPC", async () => {
    const r = await call("nope");
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "invalid_request" });
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("éxito: llama a la RPC con el cliente de sesión, dispara y responde 200", async () => {
    const r = await call(BOOK);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ book_id: BOOK, job_id: JOB });
    expect(h.rpc).toHaveBeenCalledWith("request_retry", { p_book: BOOK });
    expect(h.dispatch).toHaveBeenCalledWith(BOOK, expect.any(Object));
  });

  it.each([
    ["not_authenticated", 401],
    ["forbidden", 403],
    ["not_retryable", 409],
    ["upload_missing", 409],
    ["busy", 429],
  ])("error de la RPC %s → %i, sin disparar", async (message, status) => {
    h.rpc.mockResolvedValue({ data: null, error: { message, code: "P0001" } });
    const r = await call(BOOK);
    expect(r.status).toBe(status);
    expect(await r.json()).toEqual({ error: message });
    expect(h.dispatch).not.toHaveBeenCalled();
  });

  it("unique_violation (23505) en carrera: busy 429", async () => {
    h.rpc.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "x"', code: "23505" },
    });
    const r = await call(BOOK);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: "busy" });
    expect(h.dispatch).not.toHaveBeenCalled();
  });

  it("cualquier otro error de la RPC: 500 unexpected sin el mensaje crudo", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.rpc.mockResolvedValue({
      data: null,
      error: { message: 'relation "secret_table" does not exist', code: "42P01" },
    });
    const r = await call(BOOK);
    expect(r.status).toBe(500);
    const text = await r.text();
    expect(JSON.parse(text)).toEqual({ error: "unexpected" });
    expect(text).not.toContain("secret_table");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("secret_table");
    spy.mockRestore();
  });

  it("respuesta de la RPC con forma inválida: 500 unexpected", async () => {
    h.rpc.mockResolvedValue({ data: { book_id: "x" }, error: null });
    const r = await call(BOOK);
    expect(r.status).toBe(500);
    expect(h.dispatch).not.toHaveBeenCalled();
  });

  it("DispatchError: 502 con book_id", async () => {
    h.dispatch.mockRejectedValue(new DispatchError());
    const r = await call(BOOK);
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: "dispatch_failed", book_id: BOOK });
  });

  it("excepción inesperada al disparar: 500 genérico", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.dispatch.mockRejectedValue(new Error("clave sk-123"));
    const r = await call(BOOK);
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("sk-123");
    spy.mockRestore();
  });
});
