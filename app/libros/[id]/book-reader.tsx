"use client";

import { useCallback, useMemo, useState } from "react";
import { PageReader } from "@/components/reader/page-reader";
import { useAnnotationSync } from "@/components/reader/use-annotation-sync";
import { useLookupSync } from "@/components/reader/use-lookup-sync";
import { useReadingProgress } from "@/components/reader/use-reading-progress";
import { candidates, toLexEntry } from "@/lib/domain/lexicon-search";
import { parsePage } from "@/lib/domain/page";
import { resumePage } from "@/lib/domain/progress";
import { withLookup, type SeenWord } from "@/lib/domain/seen-words";
import { createClient } from "@/lib/supabase/client";

export const PROCESSING_MESSAGE = "Esta página aún se está procesando";

/** RF-14: carga de páginas publicadas; un 404 significa que aún no se publica. */
export function createLoaders(bookId: string) {
  return {
    async loadPage(n: number) {
      // Los errores nativos (red, JSON) y los de parsePage pueden citar la
      // respuesta o estar en inglés: la pantalla solo ve mensajes propios.
      const generic = new Error(`No se pudo cargar la página ${n}`);
      let res: Response;
      try {
        res = await fetch(`/api/libros/${bookId}/paginas/${n}/datos`);
      } catch {
        throw generic;
      }
      if (res.status === 404) throw new Error(PROCESSING_MESSAGE);
      if (!res.ok) throw generic;
      try {
        return parsePage(await res.json());
      } catch {
        throw generic;
      }
    },
    imageUrl: (n: number) => `/api/libros/${bookId}/paginas/${n}/imagen`,
  };
}

export function BookReader({
  bookId,
  total,
  userId,
  lastPage = null,
  pagesRead = [],
  initialSeen = [],
  seenBookTitles = {},
}: {
  bookId: string;
  total: number;
  userId?: string;
  /** RF-20: última página guardada de esta persona en este libro. */
  lastPage?: number | null;
  pagesRead?: number[];
  /** RF-28: diccionario personal como pares [id de léxico, palabra]. */
  initialSeen?: [number, SeenWord][];
  seenBookTitles?: Record<string, string>;
}) {
  const [seen, setSeen] = useState<ReadonlyMap<number, SeenWord>>(
    () => new Map(initialSeen),
  );
  const { loadPage, imageUrl } = useMemo(() => createLoaders(bookId), [bookId]);
  const save = useCallback(
    async (p: { lastPage: number; pagesRead: number[] }) => {
      if (!userId) return;
      // Solo se guardan valores plausibles; la fila es propia (RLS) y `updated_at` es informativo.
      const pages = [...new Set(p.pagesRead)].filter((n) => n >= 1 && n <= total);
      // RLS (RN-04): solo se escribe el progreso propio de un libro visible.
      await createClient()
        .from("reading_progress")
        .upsert(
          {
            user_id: userId,
            book_id: bookId,
            last_page: Math.min(Math.max(p.lastPage, 1), total),
            pages_read: pages,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,book_id" },
        );
    },
    [userId, bookId, total],
  );
  useLookupSync({
    bookId,
    userId,
    onLookup: (l) =>
      setSeen((m) => withLookup(m, l.lexiconId, { bookId, page: l.page })),
  });

  // RF-29: cambiar el estado (upsert: crea la fila si la consulta aún está en cola) o eliminar.
  const onSeenStatus = useCallback(
    async (lexiconId: number, status: SeenWord["status"]) => {
      if (!userId) return;
      const before = seen.get(lexiconId);
      setSeen((m) => {
        const old = m.get(lexiconId);
        return old ? new Map(m).set(lexiconId, { ...old, status }) : m;
      });
      const { error } = await createClient()
        .from("user_words")
        .upsert(
          { user_id: userId, lexicon_id: lexiconId, status },
          { onConflict: "user_id,lexicon_id" },
        );
      if (error && before)
        setSeen((m) => new Map(m).set(lexiconId, before)); // se deshace si falla
    },
    [userId, seen],
  );
  const onSeenRemove = useCallback(
    async (lexiconId: number) => {
      if (!userId) return;
      const before = seen.get(lexiconId);
      setSeen((m) => {
        const next = new Map(m);
        next.delete(lexiconId);
        return next;
      });
      const { error } = await createClient()
        .from("user_words")
        .delete()
        .eq("user_id", userId)
        .eq("lexicon_id", lexiconId);
      if (error && before) setSeen((m) => new Map(m).set(lexiconId, before));
    },
    [userId, seen],
  );
  // RF-25: única petición de léxico del lector, solo al corregir una palabra sin entrada.
  const searchLexicon = useCallback(async (word: string) => {
    const { data, error } = await createClient()
      .from("lexicon")
      .select("lemma, pos, genders, plural, senses")
      .in("lemma", candidates(word))
      .limit(5);
    if (error) throw error;
    // Prefiere sustantivos y verbos sobre otras clases cuando hay varias entradas.
    const rank = (pos: string) => (pos === "noun" ? 0 : pos === "verb" ? 1 : 2);
    const rows = [...(data ?? [])].sort((a, b) => rank(a.pos) - rank(b.pos));
    for (const r of rows) {
      const entry = toLexEntry(r);
      if (entry) return entry;
    }
    return null;
  }, []);
  const annotations = useAnnotationSync({ bookId, userId });
  const onPageChange = useReadingProgress({ save, initialPagesRead: pagesRead });
  return (
    <PageReader
      total={total}
      loadPage={loadPage}
      imageUrl={imageUrl}
      heightClassName="h-full"
      initialPage={resumePage(lastPage, total)}
      onPageChange={onPageChange}
      seenWords={userId ? seen : undefined}
      seenBookTitles={seenBookTitles}
      onSeenStatus={onSeenStatus}
      onSeenRemove={onSeenRemove}
      searchLexicon={searchLexicon}
      annotations={annotations}
    />
  );
}
