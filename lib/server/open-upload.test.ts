// @vitest-environment node
import { describe, expect, it } from "vitest";
import { openUpload, type UploadsBucket } from "./open-upload";

const stream = new ReadableStream<Uint8Array>();
const bucket = (result: { data: unknown; error: unknown }): UploadsBucket => ({
  download: () => ({ asStream: () => Promise.resolve(result) }) as never,
});
const apiError = (status: number) => Object.assign(new Error("x"), { status });

describe("openUpload", () => {
  it("devuelve el flujo (sin cargar el archivo entero en memoria)", async () => {
    expect(await openUpload(bucket({ data: stream, error: null }), "u/a.pdf")).toBe(stream);
  });

  it.each([400, 404])("estado %i (objeto no encontrado) → null", async (status) => {
    expect(await openUpload(bucket({ data: null, error: apiError(status) }), "u/a.pdf")).toBeNull();
  });

  it.each([500, 503, undefined])("error transitorio (%s) → lanza, no es «inexistente»", async (status) => {
    await expect(
      openUpload(bucket({ data: null, error: apiError(status as number) }), "u/a.pdf"),
    ).rejects.toThrow("storage_unavailable");
  });
});
