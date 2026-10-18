import { DispatchError } from "./github-dispatch";
import {
  hashPdfStream,
  MAX_PDF_BYTES,
  PdfTooLargeError,
} from "./sha256-stream";

export type FinalizeDeps = {
  /** null = el objeto no existe en Storage. */
  openUpload(path: string): Promise<ReadableStream<Uint8Array> | null>;
  deleteUpload(path: string): Promise<void>;
  /** Json crudo de finalize_submission. */
  rpcFinalize(submissionId: string, sha256: string): Promise<unknown>;
  rpcReject(submissionId: string, reason: string): Promise<void>;
  dispatch(bookId: string): Promise<void>;
};

export type FinalizeResult =
  | { ok: true; bookId: string; reused: boolean; status: string }
  | {
      ok: false;
      code:
        | "upload_missing"
        | "not_pdf"
        | "too_large"
        | "busy"
        | "forbidden"
        | "dispatch_failed"
        | "unexpected";
      bookId?: string;
    };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function tryDelete(deps: FinalizeDeps, path: string) {
  try {
    await deps.deleteUpload(path);
  } catch {
    // Un objeto huérfano no cambia el resultado; se limpia aparte.
  }
}

async function reject(
  deps: FinalizeDeps,
  sub: { id: string; upload_path: string },
  code: "upload_missing" | "not_pdf" | "too_large",
  deleteObject: boolean,
): Promise<FinalizeResult> {
  await deps.rpcReject(sub.id, code);
  if (deleteObject) await tryDelete(deps, sub.upload_path);
  return { ok: false, code };
}

// RN-02: la huella la calcula el servidor; el navegador no interviene.
export async function finalizeSubmission(
  deps: FinalizeDeps,
  sub: { id: string; upload_path: string },
  opts: { maxBytes?: number } = {},
): Promise<FinalizeResult> {
  const stream = await deps.openUpload(sub.upload_path);
  if (!stream) return reject(deps, sub, "upload_missing", false);

  let hashed;
  try {
    hashed = await hashPdfStream(stream, opts.maxBytes ?? MAX_PDF_BYTES);
  } catch (err) {
    if (err instanceof PdfTooLargeError)
      return reject(deps, sub, "too_large", true);
    return { ok: false, code: "unexpected" };
  }
  if (hashed.bytes === 0) return reject(deps, sub, "upload_missing", true);
  if (!hashed.isPdf) return reject(deps, sub, "not_pdf", true);

  let raw: unknown;
  try {
    raw = await deps.rpcFinalize(sub.id, hashed.sha256);
  } catch {
    return { ok: false, code: "unexpected" };
  }
  const r = raw as Record<string, unknown> | null;
  if (r === null || typeof r !== "object")
    return { ok: false, code: "unexpected" };

  if (r.rejected === "busy" || r.rejected === "forbidden") {
    await tryDelete(deps, sub.upload_path);
    return { ok: false, code: r.rejected };
  }
  const bookId = r.book_id;
  if (
    typeof bookId !== "string" ||
    !UUID_RE.test(bookId) ||
    typeof r.reused !== "boolean"
  ) {
    return { ok: false, code: "unexpected" };
  }
  const status = typeof r.status === "string" ? r.status : "queued";

  if (r.reused) {
    await tryDelete(deps, sub.upload_path);
    return { ok: true, bookId, reused: true, status };
  }
  try {
    await deps.dispatch(bookId);
  } catch (err) {
    if (err instanceof DispatchError)
      return { ok: false, code: "dispatch_failed", bookId };
    throw err;
  }
  return { ok: true, bookId, reused: false, status };
}
