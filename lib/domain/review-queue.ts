import {
  posGroup,
  type DictWord,
  type GenderFilter,
  type PosFilter,
} from "./dictionary";
import type { CardState } from "./review";

/** RF-48: cola de repaso, filtros, límites diarios y frase con hueco. Lógica pura. */

export type ReviewWord = DictWord;
export type ReviewState = "due" | "new" | "hard";

export type ReviewFilters = {
  bookId?: string;
  gender?: GenderFilter;
  pos?: PosFilter;
  state?: ReviewState;
};

export type QueueItem = {
  word: ReviewWord;
  card: CardState | null;
  isNew: boolean;
};

export type Limits = { newPerDay: number; maxReviews: number };
export type DoneToday = { new: number; reviews: number };

export const DEFAULT_LIMITS: Limits = { newPerDay: 10, maxReviews: 50 };
const DAY_START_HOUR = 4;
const HARD_LAPSES = 2;

/** Inicio del día de estudio (04:00 hora local) que contiene `now`. */
export function studyDayStart(now: Date): Date {
  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    DAY_START_HOUR,
  );
  if (now.getTime() < d.getTime()) d.setDate(d.getDate() - 1);
  return d;
}

function nextStudyDayStart(now: Date): Date {
  const d = studyDayStart(now);
  d.setDate(d.getDate() + 1);
  return d;
}

/** Reseñas hechas hoy (desde las 04:00 locales): nuevas = estado previo 0. */
export function countDone(
  logs: { reviewedAt: Date; stateBefore: number }[],
  now: Date,
): DoneToday {
  const start = studyDayStart(now).getTime();
  const out = { new: 0, reviews: 0 };
  for (const l of logs) {
    if (l.reviewedAt.getTime() < start) continue;
    if (l.stateBefore === 0) out.new++;
    else out.reviews++;
  }
  return out;
}

function matches(w: ReviewWord, f: ReviewFilters): boolean {
  if (w.status === "known") return false;
  if (f.bookId && w.bookId !== f.bookId) return false;
  if (f.pos && posGroup(w.pos) !== f.pos) return false;
  if (f.gender && !(w.pos === "noun" && w.genders.includes(f.gender)))
    return false;
  return true;
}

/**
 * Vencidas primero (por `due`), luego nuevas. «Vencida» = vence antes del próximo inicio de día
 * de estudio. Decisión autónoma: el filtro «difíciles» (lapses ≥ 2) es práctica libre y no
 * consume los límites diarios.
 */
export function buildQueue(
  words: ReviewWord[],
  cards: Map<number, CardState>,
  filters: ReviewFilters,
  now: Date,
  limits: Limits,
  doneToday: DoneToday,
): QueueItem[] {
  const horizon = nextStudyDayStart(now).getTime();
  const due: QueueItem[] = [];
  const fresh: QueueItem[] = [];
  const hard: QueueItem[] = [];

  for (const word of words) {
    if (!matches(word, filters)) continue;
    const card = cards.get(word.lexiconId) ?? null;
    if (!card) {
      fresh.push({ word, card: null, isNew: true });
    } else {
      const item = { word, card, isNew: false };
      if (card.lapses >= HARD_LAPSES) hard.push(item);
      if (card.due.getTime() < horizon) due.push(item);
    }
  }

  if (filters.state === "hard")
    return hard.sort((a, b) => a.card!.due.getTime() - b.card!.due.getTime());

  due.sort((a, b) => a.card!.due.getTime() - b.card!.due.getTime());
  fresh.sort((a, b) => a.word.firstSeenAt.localeCompare(b.word.firstSeenAt));
  const reviewRoom = Math.max(0, limits.maxReviews - doneToday.reviews);
  const newRoom = Math.max(0, limits.newPerDay - doneToday.new);

  const out: QueueItem[] = [];
  if (filters.state !== "new") out.push(...due.slice(0, reviewRoom));
  if (filters.state !== "due") out.push(...fresh.slice(0, newRoom));
  return out;
}

export function dueSummary(
  words: ReviewWord[],
  cards: Map<number, CardState>,
  now: Date,
  limits: Limits,
  doneToday: DoneToday,
): { due: number; new: number } {
  const q = buildQueue(words, cards, {}, now, limits, doneToday);
  let n = 0;
  for (const i of q) if (i.isNew) n++;
  return { due: q.length - n, new: n };
}

const POS: readonly PosFilter[] = ["noun", "verb", "adj", "adv", "other"];
const GENDERS: readonly GenderFilter[] = ["m", "f", "n"];
const STATES: readonly ReviewState[] = ["due", "new", "hard"];

function pick<T extends string>(
  v: string | null,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((a) => a === v);
}

export function filtersToParams(f: ReviewFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.bookId) p.set("libro", f.bookId);
  if (f.gender) p.set("genero", f.gender);
  if (f.pos) p.set("tipo", f.pos);
  if (f.state) p.set("estado", f.state);
  return p;
}

export function filtersFromParams(p: URLSearchParams): ReviewFilters {
  const out: ReviewFilters = {};
  const book = p.get("libro");
  if (book) out.bookId = book;
  const gender = pick(p.get("genero"), GENDERS);
  if (gender) out.gender = gender;
  const pos = pick(p.get("tipo"), POS);
  if (pos) out.pos = pos;
  const state = pick(p.get("estado"), STATES);
  if (state) out.state = state;
  return out;
}

// ---------------------------------------------------------------- frase con hueco

const DIACRITICS = /[̀-ͯ]/g;
const WORD = /[\p{L}]+/gu;
const BLANK = "_____";

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(DIACRITICS, "");
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Oculta los tokens de la frase que comparten raíz con el lema: ≥ 4 letras iniciales en común
 * o la raíz del lema (sin «-en»/«-n») de ≥ 3 letras. Sin coincidencia: frase completa.
 */
export function clozeSentence(
  sentence: string,
  lemma: string,
): { text: string; blanked: boolean } {
  const l = norm(lemma);
  const stem = l.replace(/(en|n)$/, "");
  const root = stem.length >= 3 ? stem : l;
  let blanked = false;
  const text = sentence.replace(WORD, (token) => {
    const t = norm(token);
    const hit =
      t === l ||
      commonPrefix(t, l) >= 4 ||
      (root.length >= 3 && t.startsWith(root));
    if (hit) blanked = true;
    return hit ? BLANK : token;
  });
  return { text: blanked ? text : sentence, blanked };
}
