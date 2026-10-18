import { NextResponse, type NextRequest } from "next/server";
import { finalizeSubmission, type FinalizeDeps } from "@/lib/server/finalize-submission";
import { dispatchProcessBook } from "@/lib/server/github-dispatch";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Leer y hashear hasta 50 MB desde Storage puede tardar más que el valor por omisión.
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const STATUS: Record<string, number> = {
  upload_missing: 422,
  not_pdf: 422,
  too_large: 422,
  forbidden: 422,
  busy: 429,
  dispatch_failed: 502,
  unexpected: 500,
};

const fail = (error: string, status: number, extra?: Record<string, string>) =>
  NextResponse.json({ error, ...extra }, { status });

function adminDeps(): FinalizeDeps {
  const admin = createAdminClient();
  return {
    async openUpload(path) {
      const { data, error } = await admin.storage.from("uploads").download(path);
      if (error || !data) return null;
      return data.stream();
    },
    async deleteUpload(path) {
      await admin.storage.from("uploads").remove([path]);
    },
    async rpcFinalize(submissionId, sha256) {
      const { data, error } = await admin.rpc("finalize_submission", {
        p_submission: submissionId,
        p_sha256: sha256,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    async rpcReject(submissionId, reason) {
      const { error } = await admin.rpc("reject_submission", {
        p_submission: submissionId,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
    },
    dispatch: (bookId) =>
      dispatchProcessBook(bookId, {
        token: process.env.GITHUB_DISPATCH_TOKEN,
        repo: process.env.GITHUB_DISPATCH_REPO,
      }),
  };
}

// RF-11 · RN-02: la huella del PDF la calcula el servidor, no el navegador.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", 400);
  }
  const id = (body as { submission_id?: unknown } | null)?.submission_id;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("not_authenticated", 401);
  if (typeof id !== "string" || !UUID_RE.test(id)) return fail("invalid_request", 400);

  // RLS: solo se ve la solicitud propia; ajena e inexistente dan el mismo 404.
  const { data: sub } = await supabase
    .from("book_submissions")
    .select("id, upload_path, status")
    .eq("id", id)
    .maybeSingle();
  if (!sub) return fail("not_found", 404);
  if (sub.status !== "pending") return fail("not_pending", 409);

  // Defensa en profundidad: la service role solo toca `<uid>/<archivo>` de esta persona.
  const prefix = `${data.user.id}/`;
  const name = sub.upload_path.slice(prefix.length);
  if (
    !sub.upload_path.startsWith(prefix) ||
    name === "" ||
    name.includes("/") ||
    name.includes("..")
  ) {
    return fail("not_found", 404);
  }

  try {
    const result = await finalizeSubmission(adminDeps(), { id: sub.id, upload_path: sub.upload_path });
    if (result.ok) {
      return NextResponse.json({
        book_id: result.bookId,
        reused: result.reused,
        status: result.status,
      });
    }
    return fail(
      result.code,
      STATUS[result.code] ?? 500,
      result.bookId ? { book_id: result.bookId } : undefined,
    );
  } catch (err) {
    // Sin cuerpo ni claves: solo el tipo de error.
    console.error("finalizar: error inesperado", err instanceof Error ? err.name : "unknown");
    return fail("unexpected", 500);
  }
}
