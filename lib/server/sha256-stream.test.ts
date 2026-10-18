// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { hashPdfStream, PdfTooLargeError } from "./sha256-stream";

function streamOf(chunks: Uint8Array[], onCancel?: () => void) {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(chunks[i++]);
      else controller.close();
    },
    cancel() {
      onCancel?.();
    },
  });
}
const enc = (s: string) => new TextEncoder().encode(s);
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

describe("hashPdfStream", () => {
  it("calcula la huella y reconoce %PDF partido entre trozos", async () => {
    const r = await hashPdfStream(streamOf([enc("%P"), enc("DF-1.7\nhola")]));
    expect(r.isPdf).toBe(true);
    expect(r.bytes).toBe(13);
    expect(r.sha256).toBe(sha(enc("%PDF-1.7\nhola")));
  });

  it("marca como no PDF un archivo con otra cabecera, pero calcula el hash", async () => {
    const r = await hashPdfStream(streamOf([enc("GIF89a....")]));
    expect(r.isPdf).toBe(false);
    expect(r.sha256).toBe(sha(enc("GIF89a....")));
  });

  it("un flujo vacío tiene 0 bytes y no es PDF", async () => {
    const r = await hashPdfStream(streamOf([]));
    expect(r.bytes).toBe(0);
    expect(r.isPdf).toBe(false);
  });

  it("rechaza al superar el tope y cancela el flujo", async () => {
    const cancel = vi.fn();
    const s = streamOf([new Uint8Array(6), new Uint8Array(6)], cancel);
    await expect(hashPdfStream(s, 10)).rejects.toBeInstanceOf(PdfTooLargeError);
    expect(cancel).toHaveBeenCalled();
  });
});
