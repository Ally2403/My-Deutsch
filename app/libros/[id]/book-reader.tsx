"use client";

import { useMemo } from "react";
import { PageReader } from "@/components/reader/page-reader";
import { parsePage } from "@/lib/domain/page";

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
}: {
  bookId: string;
  total: number;
}) {
  const { loadPage, imageUrl } = useMemo(() => createLoaders(bookId), [bookId]);
  return (
    <PageReader
      total={total}
      loadPage={loadPage}
      imageUrl={imageUrl}
      heightClassName="h-full"
    />
  );
}
