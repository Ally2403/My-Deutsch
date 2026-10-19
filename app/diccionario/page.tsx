import Link from "next/link";
import { Suspense } from "react";
import type { DictWord } from "@/lib/domain/dictionary";
import { createClient } from "@/lib/supabase/server";
import { DictionaryView } from "./dictionary-view";

const PAGE = 1000;

type Sense = { es?: string };

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

  // RN-04: RLS solo devuelve las palabras propias. PostgREST entrega ≤ 1000 filas por petición.
  const words: DictWord[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("user_words")
      .select(
        "lexicon_id, status, lookups, first_book_id, first_page, first_sentence, first_seen_at, last_seen_at, lexicon(lemma, pos, genders, plural, senses)",
      )
      .eq("user_id", me)
      .order("first_seen_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error("No se pudo cargar el diccionario");
    for (const r of data ?? []) {
      const lx = r.lexicon;
      if (!lx) continue;
      words.push({
        lexiconId: r.lexicon_id,
        lemma: lx.lemma,
        pos: lx.pos,
        genders: lx.genders,
        plural: lx.plural,
        glosses: ((lx.senses as Sense[] | null) ?? []).flatMap((s) =>
          s.es ? [s.es] : [],
        ),
        status: r.status === "known" ? "known" : "seen",
        lookups: r.lookups,
        bookId: r.first_book_id,
        page: r.first_page,
        sentence: r.first_sentence,
        firstSeenAt: r.first_seen_at,
        lastSeenAt: r.last_seen_at,
      });
    }
    if ((data?.length ?? 0) < PAGE) break;
  }

  const bookIds = [
    ...new Set(words.flatMap((w) => (w.bookId ? [w.bookId] : []))),
  ];
  const { data: books } = bookIds.length
    ? await supabase.from("books").select("id, title").in("id", bookIds)
    : { data: [] };

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp))
    if (typeof v === "string") params.set(k, v);

  return (
    <DictionaryView
      userId={me}
      initialWords={words}
      books={Object.fromEntries((books ?? []).map((b) => [b.id, b.title]))}
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link href="/grupos" className="tap-link text-sm text-muted underline">
        Volver a mis grupos
      </Link>
      <h1 className="mt-2 font-display text-3xl font-extrabold">
        Mi diccionario
      </h1>
      <Suspense fallback={<p className="mt-4 text-muted">Cargando…</p>}>
        <Diccionario searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
