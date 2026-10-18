/** RF-14: decisiones puras de la pantalla del lector de libros reales. */

export type Membership = { group_id: string; role: string };

/** Sin páginas publicadas no se monta el lector. */
export function chooseView(total: number): "empty" | "reader" {
  return total > 0 ? "reader" : "empty";
}

/** Primer grupo del libro (en su orden) del que la persona es miembro; si no, /grupos. */
export function backHref(
  bookGroupIds: readonly string[],
  memberships: readonly Membership[],
): string {
  const mine = new Set(memberships.map((m) => m.group_id));
  const first = bookGroupIds.find((g) => mine.has(g));
  return first ? `/grupos/${first}` : "/grupos";
}

/** Administrador de algún grupo que tiene el libro (misma regla que la biblioteca del grupo). */
export function isAdminInAny(
  bookGroupIds: readonly string[],
  memberships: readonly Membership[],
): boolean {
  const ids = new Set(bookGroupIds);
  return memberships.some((m) => m.role === "admin" && ids.has(m.group_id));
}
