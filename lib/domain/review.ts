import { createEmptyCard, fsrs, type Card, type Grade } from "ts-fsrs";

/** RF-48: programación de repasos con FSRS (ts-fsrs). Lógica pura, sin red. */

export type Rating = 1 | 2 | 3 | 4;
export type CardPhase = 0 | 1 | 2 | 3; // nueva · aprendiendo · repaso · reaprendiendo

export type CardState = {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardPhase;
  lastReview: Date | null;
};

export type ReviewLogInput = {
  id: string;
  rating: Rating;
  reviewedAt: Date;
  stateBefore: CardPhase;
};

export type ReviewResult = {
  card: CardState;
  log: ReviewLogInput;
};

/**
 * Decisión autónoma: sin pasos de aprendizaje de minutos (`enable_short_term: false`). La tabla
 * `card_state` no guarda `learning_steps`, así que FSRS programa en días y la sesión vuelve a
 * mostrar al final las tarjetas con «Otra vez». Sin fuzz: resultados deterministas.
 */
const scheduler = fsrs({ enable_short_term: false, enable_fuzz: false });

const GRADES: readonly Rating[] = [1, 2, 3, 4];

function toLib(c: CardState): Card {
  return {
    due: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsedDays,
    scheduled_days: c.scheduledDays,
    learning_steps: 0,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.lastReview ?? undefined,
  };
}

function fromLib(c: Card): CardState {
  return {
    due: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as CardPhase,
    lastReview: c.last_review ?? null,
  };
}

export function newCard(now: Date): CardState {
  return fromLib(createEmptyCard(now));
}

function uuid(): string {
  return globalThis.crypto.randomUUID();
}

export function schedule(
  card: CardState,
  rating: Rating,
  now: Date,
): ReviewResult {
  const next = scheduler.next(toLib(card), now, rating as Grade);
  return {
    card: fromLib(next.card),
    log: {
      id: uuid(),
      rating,
      reviewedAt: now,
      stateBefore: card.state,
    },
  };
}

/** «10 min», «5 h», «3 d», «2 mes», «1 a». */
export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d`;
  if (d < 365) return `${Math.round(d / 30)} mes`;
  return `${Math.round(d / 365)} a`;
}

export function previewIntervals(
  card: CardState,
  now: Date,
): Record<Rating, string> {
  const rec = scheduler.repeat(toLib(card), now, (r) => r);
  const out = {} as Record<Rating, string>;
  for (const g of GRADES)
    out[g] = formatInterval(rec[g as Grade].card.due.getTime() - now.getTime());
  return out;
}

/** Fila de `card_state` ↔ dominio. */
export type CardRow = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

export function cardFromRow(r: CardRow): CardState {
  return {
    due: new Date(r.due),
    stability: r.stability,
    difficulty: r.difficulty,
    elapsedDays: r.elapsed_days,
    scheduledDays: r.scheduled_days,
    reps: r.reps,
    lapses: r.lapses,
    state: (r.state >= 0 && r.state <= 3 ? r.state : 0) as CardPhase,
    lastReview: r.last_review ? new Date(r.last_review) : null,
  };
}

export function cardToRow(c: CardState): CardRow {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsedDays,
    scheduled_days: c.scheduledDays,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.lastReview ? c.lastReview.toISOString() : null,
  };
}
