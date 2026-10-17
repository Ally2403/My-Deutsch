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
