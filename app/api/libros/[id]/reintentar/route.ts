import { NextResponse, type NextRequest } from "next/server";
import { DispatchError, dispatchProcessBook } from "@/lib/server/github-dispatch";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// `message` exacto de los `raise exception` de request_retry.
const STATUS: Record<string, number> = {
  not_authenticated: 401,
  forbidden: 403,
  not_retryable: 409,
  upload_missing: 409,
  busy: 429,
};

const fail = (error: string, status: number, extra?: Record<string, string>) =>
  NextResponse.json({ error, ...extra }, { status });

// RF-13 · RN-10: reintenta un libro en error. Solo quien lo subió o un administrador.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("not_authenticated", 401);
  if (!UUID_RE.test(id)) return fail("invalid_request", 400);

  // Cliente con sesión: la RPC usa auth.uid() para decidir permisos.
  const { data: result, error } = await supabase.rpc("request_retry", { p_book: id });
  if (error) {
    const message = error.message;
    // Carrera poco probable: el índice único de trabajo activo salta antes que el chequeo.
    if (error.code === "23505") return fail("busy", 429);
    if (Object.hasOwn(STATUS, message)) return fail(message, STATUS[message]);
    // Solo el código; nunca el texto de Postgres.
    console.error("reintentar: error de la RPC", error.code ?? "unknown");
    return fail("unexpected", 500);
  }

  const r = result as { book_id?: unknown; job_id?: unknown } | null;
  if (
    !r ||
    typeof r.book_id !== "string" ||
    !UUID_RE.test(r.book_id) ||
    typeof r.job_id !== "string"
  ) {
    return fail("unexpected", 500);
  }

  try {
    await dispatchProcessBook(r.book_id, {
      token: process.env.GITHUB_DISPATCH_TOKEN,
      repo: process.env.GITHUB_DISPATCH_REPO,
      ref: process.env.GITHUB_DISPATCH_REF,
    });
  } catch (err) {
    if (err instanceof DispatchError) return fail("dispatch_failed", 502, { book_id: r.book_id });
    console.error("reintentar: error inesperado", err instanceof Error ? err.name : "unknown");
    return fail("unexpected", 500);
  }
  return NextResponse.json({ book_id: r.book_id, job_id: r.job_id });
}
