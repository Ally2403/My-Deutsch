import type { PageData } from "./page";

/** RF-28: lo que el lector sabe de una palabra de su diccionario personal. */
export type SeenWord = {
  status: "seen" | "known";
  lookups: number;
  bookId: string | null;
  page: number | null;
};

export type SeenMap = ReadonlyMap<number, SeenWord>;

/** Token → estado, para las palabras de la página cuyo lema ya está en el diccionario. */
export function seenMarksFor(
  page: PageData,
  seen: SeenMap,
): Map<number, SeenWord["status"]> {
  const marks = new Map<number, SeenWord["status"]>();
  page.tokens.forEach((t, i) => {
    const info = t.l === undefined ? undefined : seen.get(t.l);
    if (info) marks.set(i, info.status);
  });
  return marks;
}

/** Aplica una consulta nueva: crea la entrada o suma una consulta (RN-05). */
export function withLookup(
  seen: SeenMap,
  lexiconId: number,
  where: { bookId?: string | null; page?: number | null },
): Map<number, SeenWord> {
  const next = new Map(seen);
  const old = seen.get(lexiconId);
  next.set(
    lexiconId,
    old
      ? { ...old, lookups: old.lookups + 1 }
      : {
          status: "seen",
          lookups: 1,
          bookId: where.bookId ?? null,
          page: where.page ?? null,
        },
  );
  return next;
}

/** «La viste N veces · primera vez en <libro>, pág. X»; null si es la primera consulta. */
export function seenSummary(
  info: SeenWord | undefined,
  bookTitle: string | undefined,
): string | null {
  if (!info || info.lookups < 2) return null;
  const first =
    info.bookId && info.page
      ? ` · primera vez en ${bookTitle ?? "otro libro"}, pág. ${info.page}`
      : "";
  return `La viste ${info.lookups} veces${first}`;
}
