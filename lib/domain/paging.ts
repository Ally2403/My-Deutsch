export const EDGE_GUARD_PX = 24;
const MIN_SWIPE_PX = 50;

export type Direction = "next" | "prev";

export function clampPage(n: number, total: number): number {
  if (Number.isNaN(n)) return 1;
  return Math.min(Math.max(Math.round(n), 1), Math.max(total, 1));
}

export function parsePageInput(text: string, total: number): number | null {
  const s = text.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= total ? n : null;
}

/** Deslizamiento horizontal; ignora gestos que empiezan en la zona del borde reservada a iOS. */
export function swipeDirection(a: {
  startX: number;
  dx: number;
  dy: number;
  width: number;
}): Direction | null {
  if (a.startX < EDGE_GUARD_PX || a.startX > a.width - EDGE_GUARD_PX)
    return null;
  if (Math.abs(a.dx) < MIN_SWIPE_PX || Math.abs(a.dy) > Math.abs(a.dx))
    return null;
  return a.dx < 0 ? "next" : "prev";
}

export function keyDirection(key: string): Direction | null {
  if (key === "ArrowRight" || key === "PageDown") return "next";
  if (key === "ArrowLeft" || key === "PageUp") return "prev";
  return null;
}

/** Páginas vecinas que existen, la siguiente primero (RF-16 c4). */
export function prefetchTargets(page: number, total: number): number[] {
  return [page + 1, page - 1].filter((n) => n >= 1 && n <= total);
}
