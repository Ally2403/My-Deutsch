import { Suspense } from "react";
import { Page } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { loadCards, loadRecentLogs } from "@/lib/supabase/review-data";
import { loadBookTitles, loadUserWords } from "@/lib/supabase/user-words";
import { ReviewSession } from "./review-session";

async function Repaso({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims.sub;
  if (!me) return <p className="text-muted">Inicia sesión para repasar.</p>;

  const [words, cards, recentLogs] = await Promise.all([
    loadUserWords(supabase, me),
    loadCards(supabase, me),
    loadRecentLogs(supabase, me),
  ]);
  const books = await loadBookTitles(supabase, words);

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp))
    if (typeof v === "string") params.set(k, v);

  return (
    <ReviewSession
      userId={me}
      words={words}
      cards={cards}
      books={books}
      recentLogs={recentLogs}
      initialQuery={params.toString()}
    />
  );
}

export default function RepasoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Page>
      <h1 className="font-display text-3xl font-extrabold">Repaso</h1>
      <Suspense fallback={<p className="mt-4 text-muted">Cargando…</p>}>
        <Repaso searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}
