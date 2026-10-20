import type { Gender } from "./gender";

export type Box = readonly [x: number, y: number, w: number, h: number];
export type Sense = { es: string; m: boolean };
export type LexEntry = {
  lemma: string;
  pos: string;
  g?: Gender[];
  pl?: string;
  senses: Sense[];
};
export type Token = {
  t: string;
  b: Box;
  b2?: Box;
  l?: number;
  c?: number;
  sep?: number;
  f?: string;
};
/** RF-47: traducción de una oración; `r` son índices de tokens (inclusivos) dentro de un párrafo. */
export type Sentence = {
  r: readonly [first: number, last: number];
  es: string;
};
export type PageData = {
  v: 1;
  size: readonly [number, number];
  lines: (readonly [number, number])[];
  paragraphs: (readonly [number, number])[];
  images: Box[];
  fields: Box[];
  tokens: Token[];
  lex: Record<string, LexEntry>;
  sents?: Sentence[];
};

export const FORM_TAGS = ["pret", "part", "pres", "pl", "comp", "sup"] as const;
export const MAX_SENSES = 5;
export const MAX_SENTS = 80;
export const MAX_SENTENCE_CHARS = 600;

type Obj = Record<string, unknown>;

function fail(msg: string): never {
  throw new Error(`Página inválida: ${msg}`);
}

function isObj(x: unknown): x is Obj {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function arr(x: unknown, what: string): unknown[] {
  if (!Array.isArray(x)) fail(`${what} debe ser una lista`);
  return x;
}

function box(x: unknown, what: string): Box {
  const a = arr(x, what);
  if (
    a.length !== 4 ||
    !a.every((n) => typeof n === "number" && n >= 0 && n <= 1)
  ) {
    fail(`caja inválida en ${what} (cuatro números entre 0 y 1)`);
  }
  return a as unknown as Box;
}

function range(
  x: unknown,
  count: number,
  what: string,
): readonly [number, number] {
  const a = arr(x, what);
  const [s, e] = a;
  if (
    a.length !== 2 ||
    !Number.isInteger(s) ||
    !Number.isInteger(e) ||
    (s as number) < 0 ||
    (e as number) < (s as number) ||
    (e as number) >= count
  ) {
    fail(`índice fuera de los tokens en ${what}`);
  }
  return [s as number, e as number];
}

function entry(id: string, x: unknown): LexEntry {
  if (!isObj(x) || typeof x.lemma !== "string" || typeof x.pos !== "string") {
    fail(`entrada de léxico ${id} inválida`);
  }
  const senses = arr(x.senses, `acepciones de ${id}`);
  if (senses.length > MAX_SENSES)
    fail(`más de ${MAX_SENSES} acepciones en la entrada ${id}`);
  for (const s of senses) {
    if (!isObj(s) || typeof s.es !== "string" || typeof s.m !== "boolean") {
      fail(`acepción inválida en la entrada ${id}`);
    }
  }
  if (
    x.g !== undefined &&
    !(
      Array.isArray(x.g) &&
      x.g.every((g) => g === "m" || g === "n" || g === "f")
    )
  ) {
    fail(`géneros inválidos en la entrada ${id}`);
  }
  return x as unknown as LexEntry;
}

/** Valida el JSON de una página (docs/04-modelo-de-datos.md) y lo devuelve tipado. */
export function parsePage(raw: unknown): PageData {
  if (!isObj(raw)) fail("no es un objeto");
  if (raw.v !== 1) fail("versión no soportada");
  const size = arr(raw.size, "size");
  if (size.length !== 2 || !size.every((n) => typeof n === "number" && n > 0))
    fail("size inválido");

  const lexRaw = raw.lex;
  if (!isObj(lexRaw)) fail("lex debe ser un objeto");
  const lex: Record<string, LexEntry> = {};
  for (const [id, e] of Object.entries(lexRaw)) lex[id] = entry(id, e);

  const tokensRaw = arr(raw.tokens, "tokens");
  const tokens = tokensRaw.map((tk, i) => {
    if (!isObj(tk) || typeof tk.t !== "string") fail(`token ${i} inválido`);
    box(tk.b, `token ${i}`);
    if (tk.b2 !== undefined) box(tk.b2, `token ${i} (b2)`);
    if (
      tk.l !== undefined &&
      !(typeof tk.l === "number" && String(tk.l) in lex)
    ) {
      fail(`el id de léxico ${String(tk.l)} del token ${i} no existe en lex`);
    }
    if (
      tk.sep !== undefined &&
      !(
        Number.isInteger(tk.sep) &&
        (tk.sep as number) >= 0 &&
        (tk.sep as number) < tokensRaw.length
      )
    ) {
      fail(`sep fuera de rango en el token ${i}`);
    }
    if (
      tk.f !== undefined &&
      !(FORM_TAGS as readonly unknown[]).includes(tk.f)
    ) {
      fail(`forma desconocida en el token ${i}`);
    }
    return tk as unknown as Token;
  });

  let sents: Sentence[] | undefined;
  if (raw.sents !== undefined) {
    const list = arr(raw.sents, "sents");
    if (list.length > MAX_SENTS) fail(`más de ${MAX_SENTS} oraciones en sents`);
    let previousEnd = -1;
    sents = list.map((s) => {
      if (!isObj(s)) fail("oración inválida en sents");
      const r = range(s.r, tokens.length, "sents");
      if (r[0] <= previousEnd)
        fail("oraciones solapadas o desordenadas en sents");
      if (typeof s.es !== "string" || s.es.length > MAX_SENTENCE_CHARS)
        fail(
          `es de una oración debe ser texto de ${MAX_SENTENCE_CHARS} caracteres como máximo`,
        );
      previousEnd = r[1];
      return { r, es: s.es };
    });
  }

  return {
    v: 1,
    size: size as unknown as readonly [number, number],
    lines: arr(raw.lines, "lines").map((r) => range(r, tokens.length, "lines")),
    paragraphs: arr(raw.paragraphs, "paragraphs").map((r) =>
      range(r, tokens.length, "paragraphs"),
    ),
    images: arr(raw.images ?? [], "images").map((b) => box(b, "images")),
    fields: arr(raw.fields ?? [], "fields").map((b) => box(b, "fields")),
    tokens,
    lex,
    ...(sents ? { sents } : {}),
  };
}
