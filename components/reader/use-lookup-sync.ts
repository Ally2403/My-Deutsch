"use client";

import { useEffect, useRef } from "react";
import { setLookupHandler, type Lookup } from "@/lib/domain/lookup-log";
import { createLookupQueue } from "@/lib/domain/lookup-queue";
import { createClient } from "@/lib/supabase/client";

/**
 * RF-27 / RN-05: cada consulta se guarda en el diccionario personal con `record_lookup`.
 * Si no hay red, se encola en el navegador y se envía al volver (evento `online`).
 */
export function useLookupSync({
  bookId,
  userId,
  onLookup,
}: {
  bookId: string;
  userId?: string;
  /** Se llama en cada consulta, antes de guardarla, para reflejarla de inmediato (RF-28). */
  onLookup?: (lookup: Lookup) => void;
}) {
  const onLookupRef = useRef(onLookup);
  useEffect(() => {
    onLookupRef.current = onLookup;
  }, [onLookup]);
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const queue = createLookupQueue({
      key: `md-lookups:${userId}`,
      storage: window.localStorage,
      send: async (l: Lookup) => {
        const { error } = await supabase.rpc("record_lookup", {
          p_lexicon_id: l.lexiconId,
          p_book_id: l.bookId ?? bookId,
          p_page: l.page,
          p_sentence: l.sentence,
        });
        if (error) throw error;
      },
    });
    setLookupHandler((l) => {
      onLookupRef.current?.(l);
      queue.enqueue({ ...l, bookId });
      void queue.flush();
    });
    const onOnline = () => void queue.flush();
    window.addEventListener("online", onOnline);
    void queue.flush();
    return () => {
      window.removeEventListener("online", onOnline);
      setLookupHandler(null);
    };
  }, [bookId, userId]);
}
