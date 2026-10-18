import { createHash } from "node:crypto";

// RNF-11: mismo límite que el bucket `uploads` (50 MB).
export const MAX_PDF_BYTES = 52_428_800;

export class PdfTooLargeError extends Error {
  constructor() {
    super("pdf_too_large");
  }
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // "%PDF"

// RN-02: la huella la calcula el servidor leyendo el archivo por flujo (nunca entero en memoria).
export async function hashPdfStream(
  stream: ReadableStream<Uint8Array>,
  maxBytes = MAX_PDF_BYTES,
): Promise<{ sha256: string; bytes: number; isPdf: boolean }> {
  const hash = createHash("sha256");
  const head: number[] = [];
  let bytes = 0;
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new PdfTooLargeError();
      }
      for (let i = 0; head.length < 4 && i < value.length; i++)
        head.push(value[i]);
      hash.update(value);
    }
  } finally {
    reader.releaseLock();
  }
  return {
    sha256: hash.digest("hex"),
    bytes,
    isPdf: PDF_MAGIC.every((b, i) => head[i] === b),
  };
}
