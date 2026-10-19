"use client";

import { useEffect, useMemo } from "react";
import { createAnnotationSync, type Remote } from "@/lib/annotations/sync";
import { createIdbStore } from "@/lib/annotations/idb-store";
import type { Annotation } from "@/lib/domain/annotation";
import { createClient } from "@/lib/supabase/client";

/** RF-33 / RNF-14 / RN-13: respuestas escritas guardadas en IndexedDB y sincronizadas con `annotations` (RLS por usuario). */
export function useAnnotationSync({ bookId, userId }: { bookId: string; userId?: string }) {
  const sync = useMemo(() => {
    if (!userId || typeof window === "undefined") return undefined;
    const supabase = createClient();
    const remote: Remote = {
      async load(page) {
        const { data, error } = await supabase
          .from("annotations")
          .select("id, page, x, y, text, kind")
          .eq("book_id", bookId)
          .eq("page", page);
        if (error) throw error;
        return (data ?? []) as Annotation[];
      },
      async upsert(a) {
        const { error } = await supabase.from("annotations").upsert({
          id: a.id,
          user_id: userId,
          book_id: bookId,
          page: a.page,
          x: a.x,
          y: a.y,
          text: a.text,
          kind: a.kind,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      },
      async remove(id) {
        const { error } = await supabase.from("annotations").delete().eq("id", id).eq("user_id", userId);
        if (error) throw error;
      },
      async clearPage(page) {
        const { error } = await supabase
          .from("annotations")
          .delete()
          .eq("book_id", bookId)
          .eq("page", page)
          .eq("user_id", userId);
        if (error) throw error;
      },
    };
    return createAnnotationSync({
      store: createIdbStore(`md-annotations:${userId}:${bookId}`),
      remote,
    });
  }, [bookId, userId]);

  useEffect(() => {
    if (!sync) return;
    const flush = () => void sync.flush();
    window.addEventListener("online", flush);
    window.addEventListener("pagehide", flush);
    void sync.flush();
    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener("pagehide", flush);
      void sync.flush();
    };
  }, [sync]);
  return sync;
}
