"use client";

import { useCallback, useMemo } from "react";
import { PageReader } from "@/components/reader/page-reader";
import { useLookupSync } from "@/components/reader/use-lookup-sync";
import { useReadingProgress } from "@/components/reader/use-reading-progress";
import { parsePage } from "@/lib/domain/page";
import { resumePage } from "@/lib/domain/progress";
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
}: {
  bookId: string;
  total: number;
  userId?: string;
  /** RF-20: última página guardada de esta persona en este libro. */
  lastPage?: number | null;
  pagesRead?: number[];
}) {
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
  useLookupSync({ bookId, userId });
  const onPageChange = useReadingProgress({ save, initialPagesRead: pagesRead });
  return (
    <PageReader
      total={total}
      loadPage={loadPage}
      imageUrl={imageUrl}
      heightClassName="h-full"
      initialPage={resumePage(lastPage, total)}
      onPageChange={onPageChange}
    />
  );
}
