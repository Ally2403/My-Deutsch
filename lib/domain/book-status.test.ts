import { describe, expect, it } from "vitest";
import { canRetry, describeStatus, summarizeError } from "./book-status";

const base = {
  bookStatus: "processing",
  jobStatus: "running",
  pagesDone: 0,
  pageCount: null,
  error: null,
};

describe("describeStatus (RF-13)", () => {
  it("en cola", () => {
    expect(
      describeStatus({ ...base, bookStatus: "queued", jobStatus: "queued" }),
    ).toEqual({ label: "En cola", tone: "pending", progress: null });
  });
  it("procesando con total", () => {
    expect(describeStatus({ ...base, pagesDone: 12, pageCount: 200 })).toEqual({
      label: "Procesando 12/200 páginas",
      tone: "working",
      progress: 0.06,
    });
  });
  it("procesando sin total", () => {
    expect(describeStatus({ ...base, pagesDone: 12 })).toEqual({
      label: "Procesando 12 páginas…",
      tone: "working",
      progress: null,
    });
  });
  it("el progreso queda en 0–1", () => {
    expect(
      describeStatus({ ...base, pagesDone: 300, pageCount: 200 }).progress,
    ).toBe(1);
  });
  it("listo", () => {
    expect(
      describeStatus({
        ...base,
        bookStatus: "ready",
        jobStatus: "done",
        pagesDone: 200,
        pageCount: 200,
      }),
    ).toEqual({ label: "Listo", tone: "ready", progress: 1 });
  });
  it("error", () => {
    const s = describeStatus({
      ...base,
      bookStatus: "error",
      jobStatus: "error",
      error: "book_too_long",
    });
    expect(s.label).toBe("Error");
    expect(s.tone).toBe("error");
  });
  it("un job superseded nunca se muestra como error si el libro va en curso", () => {
    for (const bookStatus of ["queued", "processing", "ready"]) {
      const s = describeStatus({
        ...base,
        bookStatus,
        jobStatus: "error",
        error: "superseded",
      });
      expect(s.tone).not.toBe("error");
      expect(s.label).not.toBe("Error");
    }
  });
});

describe("canRetry (RF-13)", () => {
  const ok = {
    status: "error",
    uploadedBy: "u1",
    userId: "u1",
    isAdmin: false,
  };
  it("permite a quien subió el libro", () => {
    expect(canRetry(ok)).toBe(true);
  });
  it("permite a un administrador", () => {
    expect(canRetry({ ...ok, userId: "u2", isAdmin: true })).toBe(true);
  });
  it("niega a terceros y cuando no está en error", () => {
    expect(canRetry({ ...ok, userId: "u2" })).toBe(false);
    expect(canRetry({ ...ok, uploadedBy: null })).toBe(false);
    expect(canRetry({ ...ok, status: "processing" })).toBe(false);
    expect(canRetry({ ...ok, status: "ready", isAdmin: true })).toBe(false);
  });
});

describe("summarizeError", () => {
  it("traduce cada código del worker", () => {
    for (const c of [
      "invalid_pdf",
      "empty_book",
      "too_many_pages",
      "invalid_book_id",
      "hash_mismatch",
      "publish_failed",
      "processing_failed",
    ]) {
      const m = summarizeError(c);
      expect(m.length).toBeGreaterThan(0);
      expect(m.length).toBeLessThanOrEqual(120);
      expect(m).not.toContain("_");
    }
  });
  it("superseded da una frase neutra", () => {
    const m = summarizeError("superseded");
    expect(m).toBe("Se reemplazó por un nuevo intento");
  });
  it("nunca devuelve texto crudo desconocido", () => {
    const raw = "Traceback secreto ".repeat(40).slice(0, 500);
    const m = summarizeError(raw);
    expect(m.length).toBeLessThanOrEqual(120);
    expect(m).not.toContain("Traceback");
    expect(summarizeError(null)).toBe(summarizeError("algo_raro"));
  });
});
