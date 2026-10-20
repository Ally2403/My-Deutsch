import type { SupabaseClient } from "@supabase/supabase-js";
import type { DictWord } from "@/lib/domain/dictionary";
import type { Database } from "./database.types";

const PAGE = 1000;

type Sense = { es?: string };

/** RN-04: RLS solo devuelve las palabras propias. PostgREST entrega ≤ 1000 filas por petición. */
export async function loadUserWords(
  supabase: SupabaseClient<Database>,
  me: string,
): Promise<DictWord[]> {
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
  return words;
}

/** Títulos de los libros citados por las palabras. */
export async function loadBookTitles(
  supabase: SupabaseClient<Database>,
  words: DictWord[],
): Promise<Record<string, string>> {
  const bookIds = [
    ...new Set(words.flatMap((w) => (w.bookId ? [w.bookId] : []))),
  ];
  if (bookIds.length === 0) return {};
  const { data } = await supabase
    .from("books")
    .select("id, title")
    .in("id", bookIds);
  return Object.fromEntries((data ?? []).map((b) => [b.id, b.title]));
}
