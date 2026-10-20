import type { PageData } from "./page";
import { entryFor } from "./page-lookup";

/** Rango inclusivo de índices de tokens. */
export type TokenRange = readonly [first: number, last: number];

export type PhraseSentence = {
  range: TokenRange;
  text: string;
  /** Traducción precalculada (RF-47); null si la página no trae `sents`. */
  es: string | null;
};

export type Gloss = {
  token: number;
  form: string;
  lemma: string;
  es: string;
  pos: string;
  genders: readonly string[];
};

const bare = (t: string) => t.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");

/** Ordena los extremos de una selección e incluye ambos. */
export function tokenRangeFromSelection(
  anchorToken: number,
  focusToken: number,
): TokenRange {
  return anchorToken <= focusToken
    ? [anchorToken, focusToken]
    : [focusToken, anchorToken];
}

/** Recorta el rango a los tokens de la página; null si queda vacío. */
function clip(page: PageData, [a, b]: TokenRange): TokenRange | null {
  const first = Math.max(a, 0);
  const last = Math.min(b, page.tokens.length - 1);
  return first <= last ? [first, last] : null;
}

function textOf(page: PageData, [a, b]: TokenRange): string {
  return page.tokens
    .slice(a, b + 1)
    .map((t) => t.t)
    .join(" ");
}

/** Solo una selección de dos o más palabras abre el panel de frase. */
export function canTranslatePhrase(range: TokenRange): boolean {
  return range[1] > range[0];
}

/** Texto de la selección: palabras unidas con espacio (una palabra con guion es un token). */
export function phraseText(page: PageData, range: TokenRange): string {
  const r = clip(page, range);
  return r ? textOf(page, r) : "";
}

/** Oraciones que toca la selección, con su traducción si la página la trae. */
export function sentencesCovering(
  page: PageData,
  range: TokenRange,
): PhraseSentence[] {
  const r = clip(page, range);
  if (!r) return [];
  const covering = (page.sents ?? []).filter(
    (s) => s.r[0] <= r[1] && s.r[1] >= r[0],
  );
  if (covering.length === 0) {
    return [{ range: r, text: textOf(page, r), es: null }];
  }
  return covering.map((s) => ({
    range: s.r,
    text: textOf(page, s.r),
    es: s.es,
  }));
}

/** Primer sentido de cada palabra de la selección que tiene entrada en el léxico. */
export function glossesFor(page: PageData, range: TokenRange): Gloss[] {
  const r = clip(page, range);
  if (!r) return [];
  const out: Gloss[] = [];
  for (let i = r[0]; i <= r[1]; i++) {
    const entry = entryFor(page, i);
    const es = entry?.senses[0]?.es;
    if (!entry || !es) continue;
    out.push({
      token: i,
      form: bare(page.tokens[i].t),
      lemma: entry.lemma,
      es,
      pos: entry.pos,
      genders: entry.g ?? [],
    });
  }
  return out;
}

const SENTENCE_END = /[.!?]["”»')]?$/;

/** Rango de la oración que contiene al token: el de `sents` si existe; si no, hasta el signo
 * de fin de oración dentro del párrafo (libros subidos antes de RF-47). */
export function sentenceRangeOf(
  page: PageData,
  tokenIndex: number,
): TokenRange {
  const own = page.sents?.find(
    (s) => s.r[0] <= tokenIndex && tokenIndex <= s.r[1],
  );
  if (own) return own.r;
  const [first, last] = page.paragraphs.find(
    ([s, e]) => tokenIndex >= s && tokenIndex <= e,
  ) ?? [0, Math.max(page.tokens.length - 1, 0)];
  let start = tokenIndex;
  while (start > first && !SENTENCE_END.test(page.tokens[start - 1].t)) start--;
  let end = tokenIndex;
  while (end < last && !SENTENCE_END.test(page.tokens[end].t)) end++;
  return [start, end];
}
