import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Entero 1–400 sin ceros a la izquierda ('01' es ambiguo y se rechaza).
const PAGE_RE = /^[1-9][0-9]{0,2}$/;
const MAX_PAGE = 400;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

type PageKind = { column: "image_path" | "tokens_path"; contentType: string };

// RNF-10: la imagen de una página no cambia, así que se cachea 7 días en el dispositivo
// (ahorra egress de Storage); el JSON de tokens puede reprocesarse y se queda en 1 hora.
const CACHE_CONTROL: Record<PageKind["column"], string> = {
  image_path: "private, max-age=604800",
  tokens_path: "private, max-age=3600",
};

// RF-14 · RN-03 · RNF-06: sirve un objeto de página con la sesión de la persona (RLS en la fila
// de `pages` y en el objeto de Storage). La ruta sale siempre de la fila; nunca de la entrada.
export async function servePage(
  params: Promise<{ id: string; n: string }>,
  kind: PageKind,
): Promise<Response> {
  const { id, n } = await params;
  if (!UUID_RE.test(id) || !PAGE_RE.test(n) || Number(n) > MAX_PAGE) {
    return fail("invalid_request", 400);
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("not_authenticated", 401);

  const { data: row, error } = await supabase
    .from("pages")
    .select("image_path, tokens_path")
    .eq("book_id", id)
    .eq("number", Number(n))
    .maybeSingle();
  if (error) {
    console.error("paginas: error de la base", (error as { code?: string }).code ?? "unknown");
    return fail("unexpected", 500);
  }
  // Sin fila: no publicada o RLS la oculta; mismo 404 para ambos.
  if (!row) return fail("not_found", 404);

  const path = (row as Record<string, string>)[kind.column];
  const { data: blob, error: storageError } = await supabase.storage.from("pages").download(path);
  if (storageError) {
    const status = (storageError as { status?: number }).status;
    if (status === 400 || status === 404) return fail("not_found", 404);
    console.error("paginas: error de Storage", status ?? "unknown");
    return fail("unexpected", 500);
  }
  if (!blob) return fail("unexpected", 500);

  return new Response(blob.stream(), {
    status: 200,
    headers: {
      "Content-Type": kind.contentType,
      "Cache-Control": CACHE_CONTROL[kind.column],
      "X-Content-Type-Options": "nosniff",
    },
  });
}
