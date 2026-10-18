// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { DispatchError } from "./github-dispatch";
import { finalizeSubmission, type FinalizeDeps } from "./finalize-submission";

const SUB = {
  id: "11111111-1111-4111-8111-111111111111",
  upload_path: "u1/libro.pdf",
};
const BOOK = "0b7e5a52-3c1d-4f0a-9d63-2f1c8a4e7b10";
const stream = (bytes: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      if (bytes.length) c.enqueue(bytes);
      c.close();
    },
  });
const pdf = () => stream(new TextEncoder().encode("%PDF-1.7 contenido"));

function deps(over: Partial<FinalizeDeps> = {}) {
  const d = {
    openUpload: vi.fn().mockResolvedValue(pdf()),
    deleteUpload: vi.fn().mockResolvedValue(undefined),
    rpcFinalize: vi
      .fn()
      .mockResolvedValue({ book_id: BOOK, reused: false, status: "queued" }),
    rpcReject: vi.fn().mockResolvedValue(undefined),
    dispatch: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
  return d satisfies FinalizeDeps;
}

describe("finalizeSubmission", () => {
  it("sin objeto en Storage: rechaza con upload_missing", async () => {
    const d = deps({ openUpload: vi.fn().mockResolvedValue(null) });
    const r = await finalizeSubmission(d, SUB);
    expect(r).toEqual({ ok: false, code: "upload_missing" });
    expect(d.rpcReject).toHaveBeenCalledWith(SUB.id, "upload_missing");
    expect(d.rpcFinalize).not.toHaveBeenCalled();
  });

  it("Storage falla de forma transitoria: unexpected, sin rechazar la solicitud", async () => {
    const d = deps({ openUpload: vi.fn().mockRejectedValue(new Error("storage_unavailable")) });
    const r = await finalizeSubmission(d, SUB);
    expect(r).toEqual({ ok: false, code: "unexpected" });
    expect(d.rpcReject).not.toHaveBeenCalled();
    expect(d.deleteUpload).not.toHaveBeenCalled();
  });

  it("si rpcReject falla, igual borra el objeto y devuelve el rechazo", async () => {
    const d = deps({
      openUpload: vi.fn().mockResolvedValue(stream(new TextEncoder().encode("GIF89a..."))),
      rpcReject: vi.fn().mockRejectedValue(new Error("db caída")),
    });
    const r = await finalizeSubmission(d, SUB);
    expect(r).toEqual({ ok: false, code: "not_pdf" });
    expect(d.deleteUpload).toHaveBeenCalledWith(SUB.upload_path);
  });

  it("archivo vacío: rechaza con upload_missing", async () => {
    const d = deps({
      openUpload: vi.fn().mockResolvedValue(stream(new Uint8Array())),
    });
    const r = await finalizeSubmission(d, SUB);
    expect(r).toEqual({ ok: false, code: "upload_missing" });
    expect(d.rpcReject).toHaveBeenCalledWith(SUB.id, "upload_missing");
  });

  it("no PDF: rechaza con not_pdf, borra el objeto y no finaliza", async () => {
    const d = deps({
      openUpload: vi
        .fn()
        .mockResolvedValue(stream(new TextEncoder().encode("GIF89a..."))),
    });
    const r = await finalizeSubmission(d, SUB);
    expect(r).toEqual({ ok: false, code: "not_pdf" });
    expect(d.rpcReject).toHaveBeenCalledWith(SUB.id, "not_pdf");
    expect(d.deleteUpload).toHaveBeenCalledWith(SUB.upload_path);
    expect(d.rpcFinalize).not.toHaveBeenCalled();
  });

  it("demasiado grande: rechaza con too_large y borra el objeto", async () => {
    const d = deps({
      openUpload: vi
        .fn()
        .mockResolvedValue(new Response(new Uint8Array(60)).body),
    });
    const r = await finalizeSubmission(d, SUB, { maxBytes: 50 });
    expect(r).toEqual({ ok: false, code: "too_large" });
    expect(d.rpcReject).toHaveBeenCalledWith(SUB.id, "too_large");
    expect(d.deleteUpload).toHaveBeenCalledWith(SUB.upload_path);
  });

  it("finaliza con la huella calculada por el servidor", async () => {
    const d = deps();
    await finalizeSubmission(d, SUB);
    const sha = createHash("sha256").update("%PDF-1.7 contenido").digest("hex");
    expect(d.rpcFinalize).toHaveBeenCalledWith(SUB.id, sha);
  });

  it.each(["busy", "forbidden"] as const)(
    "rejected %s: borra el objeto y devuelve el código",
    async (code) => {
      const d = deps({
        rpcFinalize: vi.fn().mockResolvedValue({ rejected: code }),
      });
      const r = await finalizeSubmission(d, SUB);
      expect(r).toEqual({ ok: false, code });
      expect(d.deleteUpload).toHaveBeenCalledWith(SUB.upload_path);
      expect(d.dispatch).not.toHaveBeenCalled();
    },
  );

  it("libro reutilizado: no dispara, borra el objeto", async () => {
    const d = deps({
      rpcFinalize: vi
        .fn()
        .mockResolvedValue({ book_id: BOOK, reused: true, status: "ready" }),
    });
    const r = await finalizeSubmission(d, SUB);
    expect(r).toEqual({
      ok: true,
      bookId: BOOK,
      reused: true,
      status: "ready",
    });
    expect(d.dispatch).not.toHaveBeenCalled();
    expect(d.deleteUpload).toHaveBeenCalledWith(SUB.upload_path);
  });

  it("libro nuevo: dispara el workflow y conserva el PDF para el worker", async () => {
    const d = deps();
    const r = await finalizeSubmission(d, SUB);
    expect(r).toEqual({
      ok: true,
      bookId: BOOK,
      reused: false,
      status: "queued",
    });
    expect(d.dispatch).toHaveBeenCalledWith(BOOK);
    expect(d.deleteUpload).not.toHaveBeenCalled();
  });

  it("falla el disparo: dispatch_failed con book_id", async () => {
    const d = deps({
      dispatch: vi.fn().mockRejectedValue(new DispatchError()),
    });
    const r = await finalizeSubmission(d, SUB);
    expect(r).toEqual({ ok: false, code: "dispatch_failed", bookId: BOOK });
  });

  it("borrar el objeto falla: no cambia el resultado", async () => {
    const d = deps({
      rpcFinalize: vi
        .fn()
        .mockResolvedValue({ book_id: BOOK, reused: true, status: "ready" }),
      deleteUpload: vi.fn().mockRejectedValue(new Error("x")),
    });
    const r = await finalizeSubmission(d, SUB);
    expect(r.ok).toBe(true);
  });

  it.each([null, "x", {}, { book_id: "x", reused: false }, { book_id: BOOK }])(
    "respuesta del RPC con forma inválida (%j): unexpected",
    async (bad) => {
      const d = deps({ rpcFinalize: vi.fn().mockResolvedValue(bad) });
      const r = await finalizeSubmission(d, SUB);
      expect(r).toEqual({ ok: false, code: "unexpected" });
      expect(d.dispatch).not.toHaveBeenCalled();
    },
  );

  it("el RPC responde not_pending: not_pending, sin borrar el objeto ni disparar", async () => {
    const d = deps({
      rpcFinalize: vi.fn().mockResolvedValue({ rejected: "not_pending" }),
    });
    const r = await finalizeSubmission(d, SUB);
    expect(r).toEqual({ ok: false, code: "not_pending" });
    expect(d.deleteUpload).not.toHaveBeenCalled();
    expect(d.dispatch).not.toHaveBeenCalled();
  });

  it("el RPC lanza: unexpected, sin disparar", async () => {
    const d = deps({
      rpcFinalize: vi.fn().mockRejectedValue(new Error("db caída")),
    });
    const r = await finalizeSubmission(d, SUB);
    expect(r).toEqual({ ok: false, code: "unexpected" });
    expect(d.dispatch).not.toHaveBeenCalled();
  });
});
