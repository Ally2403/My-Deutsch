import { Suspense } from "react";
import { Page } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { loadBookTitles, loadUserWords } from "@/lib/supabase/user-words";
import { DictionaryView } from "./dictionary-view";

async function Diccionario({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims.sub;
  if (!me)
    return <p className="text-muted">Inicia sesión para ver tu diccionario.</p>;

  const words = await loadUserWords(supabase, me);
  const books = await loadBookTitles(supabase, words);

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp))
    if (typeof v === "string") params.set(k, v);

  return (
    <DictionaryView
      userId={me}
      initialWords={words}
      books={books}
      initialQuery={params.toString()}
    />
  );
}

export default function DiccionarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Page>
      <h1 className="font-display text-3xl font-extrabold">Mi diccionario</h1>
      <Suspense fallback={<p className="mt-4 text-muted">Cargando…</p>}>
        <Diccionario searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}
