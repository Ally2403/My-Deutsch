import { genderInfo, type Gender } from "./gender";
import type { PageData } from "./page";
import { entryFor } from "./page-lookup";

/** Token → género de los sustantivos con género conocido; excluye nombres propios y solo plurales (RN-01). */
export function highlightFor(page: PageData): Map<number, Gender> {
  const map = new Map<number, Gender>();
  page.tokens.forEach((_, i) => {
    const entry = entryFor(page, i);
    if (!entry) return;
    const info = genderInfo({ pos: entry.pos, genders: entry.g ?? [] });
    if (info.kind === "colored") map.set(i, info.gender);
  });
  return map;
}

/** Índices de los sustantivos en plural: los que cambian de forma, los iguales al singular y los de
 *  solo plural (RF-41). El worker etiqueta `f: "pl"` solo en sustantivos. */
export function pluralFor(page: PageData): Set<number> {
  const set = new Set<number>();
  page.tokens.forEach((t, i) => {
    if (t.f === "pl") set.add(i);
  });
  return set;
}
