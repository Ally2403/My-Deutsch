import { clampPage } from "./paging";

/** RN-14: una página cuenta como «leída» tras permanecer en ella este tiempo. */
export const PAGE_READ_MS = 10_000;

/** Página en la que se abre el libro: la última guardada o la primera. */
export function resumePage(
  lastPage: number | null | undefined,
  total: number,
): number {
  return clampPage(lastPage ?? 1, total);
}

export function addPageRead(pagesRead: number[], page: number): number[] {
  return [...new Set([...pagesRead, page])].sort((a, b) => a - b);
}

/** Porcentaje entero de páginas leídas (únicas y dentro del libro). */
export function percentRead(pagesRead: number[], total: number): number {
  if (total <= 0) return 0;
  const valid = new Set(pagesRead.filter((p) => p >= 1 && p <= total));
  return Math.min(100, Math.round((valid.size / total) * 100));
}
