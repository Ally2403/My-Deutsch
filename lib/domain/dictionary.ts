/** RF-30, RF-31: lógica pura del diccionario personal (búsqueda, filtros, orden y URL). */

export type WordStatus = "seen" | "known";
export type PosFilter = "noun" | "verb" | "adj" | "adv" | "other";
export type GenderFilter = "m" | "f" | "n";
export type Order = "recent" | "alpha" | "lookups";

export type DictWord = {
  lexiconId: number;
  lemma: string;
  pos: string;
  genders: string[];
  plural: string | null;
  glosses: string[];
  status: WordStatus;
  lookups: number;
  bookId: string | null;
  page: number | null;
  sentence: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type Filters = {
  q: string;
  pos: PosFilter | null;
  gender: GenderFilter | null;
  status: WordStatus | null;
  bookId: string | null;
  order: Order;
};

type Criteria = Omit<Filters, "order">;

const POS: readonly PosFilter[] = ["noun", "verb", "adj", "adv", "other"];
const GENDERS: readonly GenderFilter[] = ["m", "f", "n"];
const STATUSES: readonly WordStatus[] = ["seen", "known"];
const ORDERS: readonly Order[] = ["recent", "alpha", "lookups"];

const DIACRITICS = /[̀-ͯ]/g;

/** ß=ss y ä/ö/ü = ae/oe/ue (quien escribe sin teclado alemán usa los dígrafos). */
export function normalizeA(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFD")
    .replace(DIACRITICS, "");
}

/** Sin tildes ni diéresis: «madchen», «camion». */
export function normalizeB(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(DIACRITICS, "");
}

export function matchesSearch(word: DictWord, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const qa = normalizeA(q);
  const qb = normalizeB(q);
  return [word.lemma, ...word.glosses].some(
    (t) => normalizeA(t).includes(qa) || normalizeB(t).includes(qb),
  );
}

export function posGroup(pos: string): PosFilter {
  return pos === "noun" || pos === "verb" || pos === "adj" || pos === "adv"
    ? pos
    : "other";
}

function matches(w: DictWord, c: Criteria): boolean {
  if (c.pos && posGroup(w.pos) !== c.pos) return false;
  if (c.gender && !(w.pos === "noun" && w.genders.includes(c.gender)))
    return false;
  if (c.status && w.status !== c.status) return false;
  if (c.bookId && w.bookId !== c.bookId) return false;
  return matchesSearch(w, c.q);
}

export function filterWords(words: DictWord[], c: Criteria): DictWord[] {
  return words.filter((w) => matches(w, c));
}

/** Palabras que coinciden por cada valor de un filtro, aplicando los demás (RF-31 c2). */
export function countBy(
  words: DictWord[],
  c: Criteria,
  key: "pos" | "gender" | "status" | "bookId",
): Record<string, number> {
  const out: Record<string, number> = {};
  const rest = { ...c, [key]: null };
  for (const w of words) {
    if (!matches(w, rest)) continue;
    let values: string[];
    if (key === "pos") values = [posGroup(w.pos)];
    else if (key === "gender") values = w.pos === "noun" ? w.genders : [];
    else if (key === "status") values = [w.status];
    else values = w.bookId ? [w.bookId] : [];
    for (const v of values) out[v] = (out[v] ?? 0) + 1;
  }
  return out;
}

export function sortWords(words: DictWord[], order: Order): DictWord[] {
  const list = [...words];
  if (order === "alpha")
    return list.sort((a, b) =>
      normalizeB(a.lemma).localeCompare(normalizeB(b.lemma)),
    );
  if (order === "lookups")
    return list.sort(
      (a, b) =>
        b.lookups - a.lookups || b.lastSeenAt.localeCompare(a.lastSeenAt),
    );
  return list.sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt));
}

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.pos) p.set("tipo", f.pos);
  if (f.gender) p.set("genero", f.gender);
  if (f.status) p.set("estado", f.status);
  if (f.bookId) p.set("libro", f.bookId);
  if (f.order !== "recent") p.set("orden", f.order);
  return p;
}

function pick<T extends string>(
  v: string | null,
  allowed: readonly T[],
): T | null {
  return allowed.find((a) => a === v) ?? null;
}

export function filtersFromParams(p: URLSearchParams): Filters {
  return {
    q: p.get("q") ?? "",
    pos: pick(p.get("tipo"), POS),
    gender: pick(p.get("genero"), GENDERS),
    status: pick(p.get("estado"), STATUSES),
    bookId: p.get("libro") || null,
    order: pick(p.get("orden"), ORDERS) ?? "recent",
  };
}
