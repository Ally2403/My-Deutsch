"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  countDone,
  DEFAULT_LIMITS,
  dueSummary,
} from "@/lib/domain/review-queue";

type Props = {
  words: { id: number; known: boolean }[];
  cards: { id: number; due: string }[];
  /** Reseñas de las últimas 36 h; el día de estudio (04:00) se calcula con la hora local. */
  recentLogs: { reviewedAt: string; stateBefore: number }[];
};

const noop = () => () => {};

function Body({ words, cards, recentLogs }: Props) {
  const now = new Date();
  const done = countDone(
    recentLogs.map((l) => ({
      reviewedAt: new Date(l.reviewedAt),
      stateBefore: l.stateBefore,
    })),
    now,
  );
  const s = dueSummary(
    words.map((w) => ({
      lexiconId: w.id,
      status: w.known ? ("known" as const) : ("seen" as const),
    })),
    new Map(cards.map((c) => [c.id, { due: new Date(c.due) }])),
    now,
    DEFAULT_LIMITS,
    done,
  );

  if (words.length === 0)
    return (
      <>
        <p className="font-display text-lg font-bold">Repaso de hoy</p>
        <p className="mt-1 text-muted">
          Lee un libro y toca las palabras que no conozcas: aparecerán aquí como
          tarjetas.
        </p>
      </>
    );
  if (s.due + s.new === 0)
    return (
      <>
        <p className="font-display text-lg font-bold">Repaso de hoy</p>
        <p className="mt-1 text-muted">Estás al día</p>
      </>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-display text-lg font-bold">Repaso de hoy</p>
        <p className="mt-1 text-muted">
          {`Hoy: ${s.due} para repasar · ${s.new} ${s.new === 1 ? "nueva" : "nuevas"}`}
        </p>
      </div>
      <Link
        href="/repaso"
        className="pressable inline-flex min-h-11 items-center rounded-control bg-accent px-5 font-semibold text-on-accent"
      >
        Repasar
      </Link>
    </div>
  );
}

/** RF-48 c2: tarjeta «Repaso de hoy» de la pantalla principal. */
export function ReviewTodayCard(props: Props) {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return (
    <section aria-label="Repaso de hoy" className="card mt-6 min-h-24 p-5">
      {mounted ? <Body {...props} /> : null}
    </section>
  );
}
