import type { Gender } from "./gender";
import type { LexEntry } from "./page";

/** Variantes de escritura a probar: tal cual, minúscula y Mayúscula inicial (sustantivos). */
export function candidates(word: string): string[] {
  const w = word.trim();
  if (!w) return [];
  const cap = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  return [...new Set([w, w.toLowerCase(), cap])];
}

type Row = {
  lemma: string;
  pos: string;
  genders: string[];
  plural: string | null;
  senses: unknown;
};

/** Fila de `public.lexicon` → entrada del panel; null si no tiene significados válidos. */
export function toLexEntry(row: Row): LexEntry | null {
  const senses = Array.isArray(row.senses)
    ? row.senses.flatMap((s: unknown) => {
        const x = s as { es?: unknown; m?: unknown };
        return typeof x?.es === "string" ? [{ es: x.es, m: x.m === true }] : [];
      })
    : [];
  if (senses.length === 0) return null;
  return {
    lemma: row.lemma,
    pos: row.pos,
    g: row.genders.filter((g): g is Gender => g === "m" || g === "n" || g === "f"),
    ...(row.plural ? { pl: row.plural } : {}),
    senses,
  };
}
