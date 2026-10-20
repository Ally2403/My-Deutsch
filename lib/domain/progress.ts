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

/** RF-49: posición actual como porcentaje entero 0–100 (página 1 de 167 → 1). */
export function positionPercent(page: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((page / total) * 100)));
}

/** RF-49: texto común del lector, la página del libro y la tarjeta. */
export function progressLabel(
  page: number,
  total: number,
  pagesRead: number[],
): string {
  return `Pág. ${page} de ${total} · ${percentRead(pagesRead, total)} % leído`;
}

/** Porcentaje entero de páginas leídas (únicas y dentro del libro). */
export function percentRead(pagesRead: number[], total: number): number {
  if (total <= 0) return 0;
  const valid = new Set(pagesRead.filter((p) => p >= 1 && p <= total));
  return Math.min(100, Math.round((valid.size / total) * 100));
}
