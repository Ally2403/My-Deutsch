import { describe, expect, it } from "vitest";
import {
  MAX_TITLE_LENGTH,
  MAX_UPLOAD_BYTES,
  apiErrorMessage,
  looksLikeSessionLoss,
  validatePdfFile,
  validateTitle,
} from "./upload";

const pdfHead = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const gifHead = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39]);

describe("validateTitle (RF-11)", () => {
  it("recorta espacios", () => {
    expect(validateTitle("  Der Schatz  ")).toEqual({
      ok: true,
      title: "Der Schatz",
    });
  });
  it("rechaza vacío y solo espacios", () => {
    expect(validateTitle("").ok).toBe(false);
    expect(validateTitle("   ").ok).toBe(false);
  });
  it("acepta 200 y rechaza 201 caracteres", () => {
    expect(MAX_TITLE_LENGTH).toBe(200);
    expect(validateTitle("a".repeat(200)).ok).toBe(true);
    const r = validateTitle("a".repeat(201));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("200");
  });
});

describe("validatePdfFile (RF-11, RNF-11)", () => {
  it("rechaza archivos vacíos", () => {
    expect(validatePdfFile({ size: 0, head: pdfHead })).toEqual({
      ok: false,
      message: "El archivo está vacío",
    });
  });
  it("acepta exactamente 50 MB y rechaza un byte más", () => {
    expect(MAX_UPLOAD_BYTES).toBe(52_428_800);
    expect(validatePdfFile({ size: MAX_UPLOAD_BYTES, head: pdfHead })).toEqual({
      ok: true,
    });
    expect(
      validatePdfFile({ size: MAX_UPLOAD_BYTES + 1, head: pdfHead }),
    ).toEqual({
      ok: false,
      message:
        "El PDF supera el límite de 50 MB. Comprímelo y vuelve a intentarlo",
    });
  });
  it("rechaza una cabecera que no es %PDF", () => {
    expect(validatePdfFile({ size: 10, head: gifHead })).toEqual({
      ok: false,
      message: "El archivo no es un PDF",
    });
    expect(validatePdfFile({ size: 10, head: new Uint8Array([0x25]) }).ok).toBe(
      false,
    );
  });
});

describe("apiErrorMessage", () => {
  it("usa el texto exacto del RF-11 para busy", () => {
    expect(apiErrorMessage("busy")).toBe(
      "Espera a que termine tu libro actual",
    );
  });
  it("cubre todos los códigos de las rutas con un mensaje propio", () => {
    const codes = [
      "upload_missing",
      "not_pdf",
      "too_large",
      "forbidden",
      "busy",
      "dispatch_failed",
      "not_retryable",
      "not_pending",
      "not_authenticated",
      "not_found",
      "invalid_request",
      "unexpected",
    ];
    const fallback = apiErrorMessage("zzz_desconocido");
    expect(fallback).toBe("No se pudo completar. Inténtalo de nuevo");
    for (const c of codes) {
      const m = apiErrorMessage(c);
      expect(m.length).toBeGreaterThan(0);
      if (c !== "unexpected") expect(m).not.toBe(fallback);
    }
    expect(apiErrorMessage("too_large")).toContain("50 MB");
  });
});

describe("mensajes de sesión y de disparo fallido (RF-11)", () => {
  it("sesión caducada", () => {
    expect(apiErrorMessage("not_authenticated")).toBe(
      "Tu sesión caducó. Vuelve a iniciar sesión",
    );
  });
  it("dispatch_failed no promete «Reintentar» al instante (aparece a los 5 min)", () => {
    expect(apiErrorMessage("dispatch_failed")).toBe(
      "El libro quedó registrado, pero no pudo iniciar el procesamiento. En unos minutos podrás usar «Reintentar» en la biblioteca",
    );
  });
  it("looksLikeSessionLoss: redirección o contenido que no es JSON", () => {
    const h = (ct: string | null) => ({ get: () => ct });
    expect(looksLikeSessionLoss({ ok: true, redirected: true })).toBe(true);
    expect(
      looksLikeSessionLoss({ ok: true, redirected: false, headers: h("text/html") }),
    ).toBe(true);
    expect(
      looksLikeSessionLoss({
        ok: true,
        redirected: false,
        headers: h("application/json"),
      }),
    ).toBe(false);
    // Sin cabeceras (dobles de prueba) o respuestas de error: no es pérdida de sesión.
    expect(looksLikeSessionLoss({ ok: true })).toBe(false);
    expect(
      looksLikeSessionLoss({ ok: false, headers: h("text/html") }),
    ).toBe(false);
  });
});

describe("not_retryable (RF-13)", () => {
  it("explica que hay que esperar", () => {
    expect(apiErrorMessage("not_retryable")).toBe(
      "Aún no se puede reintentar. Espera unos minutos e inténtalo de nuevo",
    );
  });
});

describe("RETRY_DISPATCH_FAILED_MESSAGE (RF-13)", () => {
  it("es propio del reintento y distinto del de la subida", async () => {
    const { RETRY_DISPATCH_FAILED_MESSAGE } = await import("./upload");
    expect(RETRY_DISPATCH_FAILED_MESSAGE).toBe(
      "El reintento quedó registrado pero no pudo iniciarse. Si sigue «En cola», podrás reintentar de nuevo en unos minutos",
    );
    expect(RETRY_DISPATCH_FAILED_MESSAGE).not.toBe(
      apiErrorMessage("dispatch_failed"),
    );
  });
});
