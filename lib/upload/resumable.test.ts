import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  instances: [] as Array<{
    file: unknown;
    options: Record<string, unknown>;
    previous: unknown[];
    findPreviousUploads: ReturnType<typeof vi.fn>;
    resumeFromPreviousUpload: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    abort: ReturnType<typeof vi.fn>;
  }>,
  previous: [] as unknown[],
  rejectFind: false,
}));

vi.mock("tus-js-client", () => ({
  Upload: class {
    file: unknown;
    options: Record<string, unknown>;
    previous = h.previous;
    findPreviousUploads = vi.fn(async () => {
      if (h.rejectFind) throw new Error("x");
      return this.previous;
    });
    resumeFromPreviousUpload = vi.fn();
    start = vi.fn();
    abort = vi.fn(async () => undefined);
    constructor(file: unknown, options: Record<string, unknown>) {
      this.file = file;
      this.options = options;
      h.instances.push(this);
    }
  },
}));

import { startResumableUpload } from "./resumable";

const file = new File(["%PDF-1"], "libro.pdf", { type: "application/pdf" });
const base = () => ({
  file,
  objectName: "uid-1/abc.pdf",
  accessToken: "tok",
  supabaseUrl: "https://x.supabase.co",
  onProgress: vi.fn(),
  onSuccess: vi.fn(),
  onError: vi.fn(),
});

beforeEach(() => {
  h.instances.length = 0;
  h.previous = [];
  h.rejectFind = false;
});

describe("startResumableUpload", () => {
  it("pasa los parámetros fijos de Supabase a tus.Upload", () => {
    startResumableUpload(base());
    const o = h.instances[0].options as {
      endpoint: string;
      chunkSize: number;
      retryDelays: number[];
      removeFingerprintOnSuccess: boolean;
      uploadDataDuringCreation: boolean;
      headers: Record<string, string>;
      metadata: Record<string, string>;
    };
    expect(o.endpoint).toBe("https://x.supabase.co/storage/v1/upload/resumable");
    expect(o.chunkSize).toBe(6 * 1024 * 1024);
    expect(o.retryDelays).toEqual([0, 3000, 5000, 10000, 20000]);
    expect(o.removeFingerprintOnSuccess).toBe(true);
    expect(o.uploadDataDuringCreation).toBe(true);
    expect(o.headers.authorization).toBe("Bearer tok");
    expect(o.headers["x-upsert"]).toBe("false");
    expect(o.metadata).toMatchObject({
      bucketName: "uploads",
      objectName: "uid-1/abc.pdf",
      contentType: "application/pdf",
      cacheControl: "3600",
    });
  });

  it("reanuda el primer avance previo si existe", async () => {
    h.previous = [{ uploadUrl: "u1" }, { uploadUrl: "u2" }];
    startResumableUpload(base()).start();
    await vi.waitFor(() => expect(h.instances[0].start).toHaveBeenCalled());
    expect(h.instances[0].resumeFromPreviousUpload).toHaveBeenCalledWith({
      uploadUrl: "u1",
    });
  });

  it("empieza de cero si no hay avance previo", async () => {
    startResumableUpload(base()).start();
    await vi.waitFor(() => expect(h.instances[0].start).toHaveBeenCalled());
    expect(h.instances[0].resumeFromPreviousUpload).not.toHaveBeenCalled();
  });

  it("si findPreviousUploads falla, inicia igual", async () => {
    h.rejectFind = true;
    startResumableUpload(base()).start();
    await vi.waitFor(() => expect(h.instances[0].start).toHaveBeenCalled());
    expect(h.instances[0].findPreviousUploads).toHaveBeenCalled();
    expect(h.instances[0].resumeFromPreviousUpload).not.toHaveBeenCalled();
  });

  it("no reintenta el 409 de creación (el objeto ya existe)", () => {
    startResumableUpload(base());
    const o = h.instances[0].options as {
      onShouldRetry(e: unknown, n: number, o: unknown): boolean;
    };
    const err = (status: number) => ({
      originalResponse: { getStatus: () => status },
    });
    expect(o.onShouldRetry(err(409), 0, {})).toBe(false);
    expect(o.onShouldRetry(err(500), 0, {})).toBe(true);
    expect(o.onShouldRetry(new Error("red"), 0, {})).toBe(true);
  });

  it("reenvía progreso, éxito y error; abort llama a tus abort", async () => {
    const args = base();
    const handle = startResumableUpload(args);
    const o = h.instances[0].options as {
      onProgress(a: number, b: number): void;
      onSuccess(): void;
      onError(e: Error): void;
    };
    o.onProgress(5, 10);
    o.onSuccess();
    o.onError(new Error("boom"));
    expect(args.onProgress).toHaveBeenCalledWith(5, 10);
    expect(args.onSuccess).toHaveBeenCalled();
    expect(args.onError).toHaveBeenCalledWith(expect.any(Error));
    await handle.abort();
    expect(h.instances[0].abort).toHaveBeenCalled();
  });
});
