import type { LexEntry, PageData } from "./page";

const FORM_LABEL: Record<string, string> = {
  pret: "pretérito",
  part: "participio",
  pres: "presente",
  pl: "plural",
  comp: "comparativo",
  sup: "superlativo",
};

const POS_LABEL: Record<string, string> = {
  noun: "sustantivo",
  propn: "nombre propio",
  verb: "verbo",
  adj: "adjetivo",
  adv: "adverbio",
  prep: "preposición",
  pron: "pronombre",
  det: "artículo",
  conj: "conjunción",
  num: "numeral",
  part: "partícula",
  intj: "interjección",
};

const SENTENCE_END = /[.!?]["”»')]?$/;

export function formLabel(f: string | undefined): string | null {
  return (f && FORM_LABEL[f]) || null;
}

export function posLabel(pos: string): string {
  return POS_LABEL[pos] ?? "palabra";
}

export function entryFor(page: PageData, tokenIndex: number): LexEntry | null {
  const token = page.tokens[tokenIndex];
  if (!token || token.l === undefined) return null;
  return page.lex[String(token.l)] ?? null;
}

export function pairOf(page: PageData, tokenIndex: number): number | null {
  const token = page.tokens[tokenIndex];
  if (!token) return null;
  if (token.sep !== undefined) return token.sep;
  const back = page.tokens.findIndex((t) => t.sep === tokenIndex);
  return back === -1 ? null : back;
}

/** Oración (hasta `.`, `!` o `?`) dentro del párrafo que contiene al token. */
export function sentenceOf(page: PageData, tokenIndex: number): string {
  if (!page.tokens[tokenIndex]) return "";
  const [first, last] = page.paragraphs.find(
    ([s, e]) => tokenIndex >= s && tokenIndex <= e,
  ) ?? [0, page.tokens.length - 1];
  let start = tokenIndex;
  while (start > first && !SENTENCE_END.test(page.tokens[start - 1].t)) start--;
  let end = tokenIndex;
  while (end < last && !SENTENCE_END.test(page.tokens[end].t)) end++;
  return page.tokens
    .slice(start, end + 1)
    .map((t) => t.t)
    .join(" ");
}

/** Texto en orden de lectura: palabras separadas por espacio y una línea por salto (RF-17). */
export function plainText(page: PageData): string {
  return page.lines
    .map(([s, e]) =>
      page.tokens
        .slice(s, e + 1)
        .map((t) => t.t)
        .join(" "),
    )
    .join("\n");
}
