"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button, OutlineButton } from "@/components/ui";
import type { GenderFilter, PosFilter } from "@/lib/domain/dictionary";
import { genderInfo } from "@/lib/domain/gender";
import { posLabel } from "@/lib/domain/page-lookup";
import {
  cardFromRow,
  newCard,
  previewIntervals,
  schedule,
  type CardRow,
  type CardState,
  type Rating,
} from "@/lib/domain/review";
import {
  buildQueue,
  clozeSentence,
  countDone,
  DEFAULT_LIMITS,
  filtersFromParams,
  filtersToParams,
  skipKnown,
  type QueueItem,
  type ReviewFilters,
  type ReviewState,
  type ReviewWord,
} from "@/lib/domain/review-queue";
import { createReviewSync } from "@/lib/domain/review-sync";
import { createClient } from "@/lib/supabase/client";
import { supabaseReviewStore } from "@/lib/supabase/review-store";

type Result = {
  lexiconId: number;
  card: CardState;
  log: ReturnType<typeof schedule>["log"];
};

export type ReviewSyncLike = {
  submit(result: Result): Promise<void>;
  flush(): Promise<void>;
};

type Props = {
  userId: string | null;
  words: ReviewWord[];
  cards: Record<number, CardRow>;
  books: Record<string, string>;
  /** Reseñas de las últimas 36 h: el «día» (04:00) se calcula con la hora local del dispositivo. */
  recentLogs: { reviewedAt: string; stateBefore: number }[];
  initialQuery?: string;
  /** Demostración sin sesión (pruebas e2e): nada se guarda en la base de datos. */
  demo?: boolean;
  sync?: ReviewSyncLike;
  markKnown?: (lexiconId: number) => Promise<void>;
  /** Ventana (ms) para «Deshacer» antes de guardar la reseña. */
  undoWindowMs?: number;
};

const GENDER_CLASS = {
  m: "text-gender-m",
  n: "text-gender-n",
  f: "text-gender-f",
} as const;

const GENDERS: { value: GenderFilter; label: string; cls: string }[] = [
  { value: "m", label: "der", cls: "text-gender-m" },
  { value: "n", label: "das", cls: "text-gender-n" },
  { value: "f", label: "die", cls: "text-gender-f" },
];
const POS: { value: PosFilter; label: string }[] = [
  { value: "noun", label: "Sustantivos" },
  { value: "verb", label: "Verbos" },
  { value: "adj", label: "Adjetivos" },
  { value: "adv", label: "Adverbios" },
  { value: "other", label: "Otros" },
];
const STATES: { value: ReviewState; label: string }[] = [
  { value: "due", label: "Vencidas" },
  { value: "new", label: "Nuevas" },
  { value: "hard", label: "Difíciles" },
];
const RATINGS: { value: Rating; label: string }[] = [
  { value: 1, label: "Otra vez" },
  { value: 2, label: "Difícil" },
  { value: 3, label: "Bien" },
  { value: 4, label: "Fácil" },
];

function Chip({
  active,
  onClick,
  className = "",
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`chip ${className}`}
    >
      {children}
    </button>
  );
}

function WordHead({ word, size }: { word: ReviewWord; size: string }) {
  const info = genderInfo({ pos: word.pos, genders: word.genders });
  return (
    <p className={`break-words font-display font-extrabold ${size}`}>
      {info.kind === "colored" && (
        <>
          <span
            data-testid="card-article"
            className={GENDER_CLASS[info.gender]}
          >
            {info.articles.join("/")}
          </span>{" "}
        </>
      )}
      <span>{word.lemma}</span>
    </p>
  );
}

type Last = {
  result: Result;
  prevQueue: QueueItem[];
  prevIndex: number;
  prevCard: CardState | null;
  wasNew: boolean;
};

function SessionInner({
  userId,
  words,
  cards,
  books,
  recentLogs,
  initialQuery,
  demo = false,
  sync,
  markKnown,
  undoWindowMs = 6000,
}: Props) {
  const [filters, setFilters] = useState<ReviewFilters>(() =>
    filtersFromParams(new URLSearchParams(initialQuery ?? window.location.search)),
  );
  const [cardMap, setCardMap] = useState<Map<number, CardState>>(
    () =>
      new Map(
        Object.entries(cards).map(([k, v]) => [Number(k), cardFromRow(v)]),
      ),
  );
  const baseDone = useMemo(
    () =>
      countDone(
        recentLogs.map((l) => ({
          reviewedAt: new Date(l.reviewedAt),
          stateBefore: l.stateBefore,
        })),
        new Date(),
      ),
    [recentLogs],
  );
  const [sessionDone, setSessionDone] = useState({ new: 0, reviews: 0 });
  const [queue, setQueue] = useState<QueueItem[]>(() =>
    buildQueue(words, cardMap, filters, new Date(), DEFAULT_LIMITS, baseDone),
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false); // false: español → alemán
  const [last, setLast] = useState<Last | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncRef = useRef<ReviewSyncLike | null>(sync ?? null);
  const lastRef = useRef<Last | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSync = useCallback((): ReviewSyncLike => {
    if (!syncRef.current) {
      const store =
        demo || !userId
          ? { save: async () => {} }
          : supabaseReviewStore(userId);
      syncRef.current = createReviewSync({
        store,
        storage: window.localStorage,
        key: `md-reviews:${userId ?? "demo"}`,
      });
    }
    return syncRef.current;
  }, [demo, userId]);

  /** Guarda la última reseña pendiente (al calificar otra, al pasar la ventana, al salir). */
  const commit = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const pending = lastRef.current;
    lastRef.current = null;
    setLast(null);
    if (pending)
      void getSync()
        .submit(pending.result)
        .catch(() => {});
  }, [getSync]);

  useEffect(() => {
    void getSync().flush();
    const onOnline = () => void getSync().flush();
    const onHide = () => {
      if (document.visibilityState === "hidden") commit();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("pagehide", commit);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pagehide", commit);
      document.removeEventListener("visibilitychange", onHide);
      commit();
    };
  }, [commit, getSync]);

  const done = useMemo(
    () => ({
      new: baseDone.new + sessionDone.new,
      reviews: baseDone.reviews + sessionDone.reviews,
    }),
    [baseDone, sessionDone],
  );

  function rebuild(next: ReviewFilters) {
    commit();
    setFilters(next);
    const qs = filtersToParams(next).toString();
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
    setQueue(
      buildQueue(words, cardMap, next, new Date(), DEFAULT_LIMITS, done),
    );
    setIndex(0);
    setFlipped(false);
  }

  function toggle<K extends keyof ReviewFilters>(
    key: K,
    value: ReviewFilters[K],
  ) {
    const next = { ...filters };
    if (next[key] === value) delete next[key];
    else next[key] = value;
    rebuild(next);
  }

  const item: QueueItem | undefined = queue[index];
  const total = queue.length;
  const finished = total > 0 && index >= total;
  const currentCard = item ? (item.card ?? newCard(new Date())) : null;
  const intervals = useMemo(
    () =>
      currentCard && flipped ? previewIntervals(currentCard, new Date()) : null,
    [currentCard, flipped],
  );

  const rate = useCallback(
    (rating: Rating) => {
      if (!item || !flipped) return;
      commit();
      const now = new Date();
      const base = item.card ?? newCard(now);
      const { card, log } = schedule(base, rating, now);
      const result: Result = { lexiconId: item.word.lexiconId, card, log };
      const snapshot: Last = {
        result,
        prevQueue: queue,
        prevIndex: index,
        prevCard: item.card,
        wasNew: item.isNew,
      };
      lastRef.current = snapshot;
      setLast(snapshot);
      timerRef.current = setTimeout(commit, undoWindowMs);
      setCardMap((m) => new Map(m).set(item.word.lexiconId, card));
      setSessionDone((d) =>
        item.isNew
          ? { ...d, new: d.new + 1 }
          : { ...d, reviews: d.reviews + 1 },
      );
      // «Otra vez»: la tarjeta vuelve al final de esta sesión.
      if (rating === 1)
        setQueue((q) => [...q, { word: item.word, card, isNew: false }]);
      setIndex(index + 1);
      setFlipped(false);
    },
    [item, flipped, queue, index, commit, undoWindowMs],
  );

  function undo() {
    const l = lastRef.current;
    if (!l) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    lastRef.current = null;
    setLast(null);
    setQueue(l.prevQueue);
    setIndex(l.prevIndex);
    setFlipped(false);
    setCardMap((m) => {
      const n = new Map(m);
      if (l.prevCard) n.set(l.result.lexiconId, l.prevCard);
      else n.delete(l.result.lexiconId);
      return n;
    });
    setSessionDone((d) =>
      l.wasNew ? { ...d, new: d.new - 1 } : { ...d, reviews: d.reviews - 1 },
    );
  }

  async function known() {
    if (!item) return;
    setError(null);
    try {
      if (markKnown) await markKnown(item.word.lexiconId);
      else if (!demo && userId) {
        const { error: e } = await createClient()
          .from("user_words")
          .update({ status: "known" })
          .eq("user_id", userId)
          .eq("lexicon_id", item.word.lexiconId);
        if (e) throw e;
      }
    } catch {
      setError("No se pudo marcar la palabra. Revisa tu conexión.");
      return;
    }
    const id = item.word.lexiconId;
    setQueue((q) => [
      ...q.slice(0, index),
      ...skipKnown(q.slice(index), new Set([id])),
    ]);
    setFlipped(false);
  }

  // Atajos: Espacio voltea, 1–4 califican.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyRef.current = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === " " || e.code === "Space") {
        if (t?.tagName === "BUTTON") return; // el botón enfocado lo activa por sí mismo
        e.preventDefault();
        if (item && !flipped) setFlipped(true);
      } else if (e.key >= "1" && e.key <= "4") {
        rate(Number(e.key) as Rating);
      }
    };
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const anyFilter = Object.keys(filters).length > 0;
  const bookIds = useMemo(
    () => Object.keys(books).filter((id) => words.some((w) => w.bookId === id)),
    [books, words],
  );

  // ---------------------------------------------------------------- vistas
  if (words.length === 0) {
    return (
      <div className="card mt-6 p-6 text-center">
        <p className="font-display text-xl font-bold">
          Aún no tienes palabras para repasar
        </p>
        <p className="mt-2 text-muted">
          Abre un libro y toca las palabras que no conozcas: aparecerán aquí
          como tarjetas.
        </p>
        <Link
          href="/grupos"
          className="pressable mt-4 inline-flex min-h-11 items-center rounded-control bg-accent px-5 font-semibold text-on-accent"
        >
          Ir a mis libros
        </Link>
      </div>
    );
  }

  const front = item
    ? (() => {
        if (reverse) return null;
        const c = item.word.sentence
          ? clozeSentence(item.word.sentence, item.word.lemma)
          : null;
        return c && c.blanked ? c.text : null;
      })()
    : null;
  const source = item?.word.bookId ? books[item.word.bookId] : null;

  return (
    <div className="mt-5">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filtros del repaso"
      >
        {GENDERS.map((g) => (
          <Chip
            key={g.value}
            active={filters.gender === g.value}
            className={g.cls}
            onClick={() => toggle("gender", g.value)}
          >
            {g.label}
          </Chip>
        ))}
        {STATES.map((s) => (
          <Chip
            key={s.value}
            active={filters.state === s.value}
            onClick={() => toggle("state", s.value)}
          >
            {s.label}
          </Chip>
        ))}
        {POS.map((p) => (
          <Chip
            key={p.value}
            active={filters.pos === p.value}
            onClick={() => toggle("pos", p.value)}
          >
            {p.label}
          </Chip>
        ))}
        {bookIds.map((id) => (
          <Chip
            key={id}
            active={filters.bookId === id}
            onClick={() => toggle("bookId", id)}
          >
            {books[id]}
          </Chip>
        ))}
        <Chip
          active={reverse}
          onClick={() => {
            setReverse((r) => !r);
            setFlipped(false);
          }}
        >
          Alemán → español
        </Chip>
      </div>

      {total === 0 && (
        <div className="card mt-5 p-6 text-center">
          <p className="font-display text-xl font-bold">Estás al día</p>
          <p className="mt-2 text-muted">
            {anyFilter
              ? "Nada pendiente con estos filtros."
              : "No tienes tarjetas pendientes por ahora. Sigue leyendo para sumar palabras nuevas."}
          </p>
        </div>
      )}

      {finished && (
        <div className="card mt-5 p-6 text-center">
          <p className="font-display text-2xl font-extrabold">
            Terminaste por hoy
          </p>
          <p className="mt-2 text-muted">
            Repasaste {total} {total === 1 ? "tarjeta" : "tarjetas"}.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {last && (
              <OutlineButton type="button" onClick={undo}>
                Deshacer
              </OutlineButton>
            )}
            <Link
              href="/diccionario"
              className="pressable inline-flex min-h-11 items-center rounded-control bg-accent px-5 font-semibold text-on-accent"
            >
              Ver mi diccionario
            </Link>
          </div>
        </div>
      )}

      {item && (
        <>
          <div className="mt-5 flex items-center gap-3">
            <p className="text-sm font-medium text-muted" aria-live="polite">
              {`${index + 1} de ${total}`}
            </p>
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent-soft"
              aria-hidden="true"
            >
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${(index / total) * 100}%` }}
              />
            </div>
            {last && (
              <OutlineButton
                type="button"
                onClick={undo}
                className="!min-h-11 !px-4 text-sm"
              >
                Deshacer
              </OutlineButton>
            )}
          </div>

          <div
            className="card mt-3 min-h-64 p-5 sm:p-8"
            onClick={() => !flipped && setFlipped(true)}
          >
            {!flipped && !reverse && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  ¿Cómo se dice en alemán?
                </p>
                <p className="mt-3 break-words font-display text-3xl font-extrabold">
                  {item.word.glosses.length > 0
                    ? item.word.glosses.slice(0, 3).join("; ")
                    : "(sin significado)"}
                </p>
                {front && <p className="mt-5 text-lg text-muted">{front}</p>}
              </>
            )}
            {!flipped && reverse && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  ¿Qué significa?
                </p>
                <div className="mt-3">
                  <WordHead word={item.word} size="text-3xl" />
                </div>
                {item.word.sentence && (
                  <p className="mt-5 text-lg text-muted">
                    {item.word.sentence}
                  </p>
                )}
              </>
            )}
            {flipped && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {posLabel(item.word.pos)}
                </p>
                <div className="mt-3">
                  <WordHead word={item.word} size="text-3xl" />
                </div>
                {item.word.plural && (
                  <p className="mt-1 text-muted">Plural: {item.word.plural}</p>
                )}
                <ul className="mt-3 list-inside list-disc text-lg">
                  {item.word.glosses.slice(0, 4).map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
                {item.word.sentence && (
                  <blockquote className="mt-4 border-l-2 border-border pl-3 text-muted">
                    {item.word.sentence}
                    {(source || item.word.page) && (
                      <footer className="mt-1 text-sm">
                        {[
                          source,
                          item.word.page ? `p. ${item.word.page}` : null,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </footer>
                    )}
                  </blockquote>
                )}
              </>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}

          {!flipped ? (
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={() => setFlipped(true)}
            >
              Mostrar respuesta
            </Button>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => rate(r.value)}
                    className="pressable flex min-h-14 flex-col items-center justify-center rounded-control border border-border bg-surface px-1 py-2 text-sm font-semibold"
                  >
                    <span className={r.value === 1 ? "text-danger" : undefined}>
                      {r.label}
                    </span>
                    <span className="text-xs font-normal text-muted">
                      {intervals?.[r.value]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => void known()}
                  className="pressable min-h-11 rounded-control px-4 text-sm font-medium text-muted underline"
                >
                  Ya la sé
                </button>
              </div>
            </>
          )}
          <p className="mt-3 hidden text-center text-xs text-muted sm:block">
            Espacio para voltear · teclas 1–4 para calificar
          </p>
        </>
      )}
    </div>
  );
}

const noop = () => () => {};

/**
 * La cola depende de la hora local (día de estudio a las 04:00), así que se arma solo en el
 * navegador: en el servidor y en la hidratación se muestra "Cargando…".
 */
export function ReviewSession(props: Props) {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  if (!mounted) return <p className="mt-4 text-muted">Cargando…</p>;
  return <SessionInner {...props} />;
}
