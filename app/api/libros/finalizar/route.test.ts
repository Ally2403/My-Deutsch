// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const SUB = "11111111-1111-4111-8111-111111111111";
const BOOK = "0b7e5a52-3c1d-4f0a-9d63-2f1c8a4e7b10";

const h = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  submission: { id: "x", upload_path: "u1/secreto.pdf", status: "pending" } as {
    id: string;
    upload_path: string;
    status: string;
  } | null,
  createAdminClient: vi.fn(() => ({ storage: {}, rpc: vi.fn() })),
  finalizeSubmission: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: h.submission, error: null }) }),
      }),
    }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: h.createAdminClient }));
vi.mock("@/lib/server/finalize-submission", () => ({ finalizeSubmission: h.finalizeSubmission }));

import { POST } from "./route";

const call = (body: unknown) =>
  POST(
    new Request("http://localhost/api/libros/finalizar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }) as never,
  );

beforeEach(() => {
  h.user = { id: "u1" };
  h.submission = { id: SUB, upload_path: "u1/secreto.pdf", status: "pending" };
  h.createAdminClient.mockClear();
  h.finalizeSubmission.mockReset();
  h.finalizeSubmission.mockResolvedValue({
    ok: true,
    bookId: BOOK,
    reused: false,
    status: "queued",
  });
});

describe("POST /api/libros/finalizar", () => {
  it("sin sesión: 401 y no crea el cliente admin", async () => {
    h.user = null;
    const r = await call({ submission_id: SUB });
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "not_authenticated" });
    expect(h.createAdminClient).not.toHaveBeenCalled();
  });

  it.each([{}, { submission_id: "nope" }, "no es json", { submission_id: 5 }])(
    "cuerpo inválido %j: 400",
    async (body) => {
      const r = await call(body);
      expect(r.status).toBe(400);
      expect(await r.json()).toEqual({ error: "invalid_request" });
    },
  );

  it("solicitud que la sesión no ve (ajena o inexistente): 404 sin tocar Storage", async () => {
    h.submission = null;
    const r = await call({ submission_id: SUB });
    expect(r.status).toBe(404);
    expect(h.finalizeSubmission).not.toHaveBeenCalled();
    expect(h.createAdminClient).not.toHaveBeenCalled();
  });

  it.each(["u2/otro.pdf", "u1/../u2/otro.pdf", "u1/sub/otro.pdf", "u1/", "u1x/a.pdf"])(
    "ruta de subida que no es del usuario (%s): 404 sin cliente admin",
    async (path) => {
      h.submission = { id: SUB, upload_path: path, status: "pending" };
      const r = await call({ submission_id: SUB });
      expect(r.status).toBe(404);
      expect(h.finalizeSubmission).not.toHaveBeenCalled();
      expect(h.createAdminClient).not.toHaveBeenCalled();
    },
  );

  it("solicitud ya procesada: 409", async () => {
    h.submission = { id: SUB, upload_path: "u1/a.pdf", status: "verified" };
    const r = await call({ submission_id: SUB });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ error: "not_pending" });
    expect(h.finalizeSubmission).not.toHaveBeenCalled();
  });

  it("éxito: 200 con book_id, reused y status; sin upload_path", async () => {
    const r = await call({ submission_id: SUB });
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(JSON.parse(text)).toEqual({ book_id: BOOK, reused: false, status: "queued" });
    expect(text).not.toContain("secreto");
  });

  it.each([
    ["upload_missing", 422],
    ["not_pdf", 422],
    ["too_large", 422],
    ["forbidden", 422],
    ["busy", 429],
    ["not_pending", 409],
    ["unexpected", 500],
  ])("código %s → %i", async (code, status) => {
    h.finalizeSubmission.mockResolvedValue({ ok: false, code });
    const r = await call({ submission_id: SUB });
    expect(r.status).toBe(status);
    expect(await r.json()).toEqual({ error: code });
  });

  it("dispatch_failed → 502 con book_id", async () => {
    h.finalizeSubmission.mockResolvedValue({ ok: false, code: "dispatch_failed", bookId: BOOK });
    const r = await call({ submission_id: SUB });
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: "dispatch_failed", book_id: BOOK });
  });

  it("excepción inesperada: 500 genérico", async () => {
    h.finalizeSubmission.mockRejectedValue(new Error("clave sk-123"));
    const r = await call({ submission_id: SUB });
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("sk-123");
  });
});
