"use client";

import { useState } from "react";

const NOUNS = {
  Tisch: {
    article: "der",
    cls: "text-gender-m",
    es: "mesa",
    plural: "die Tische",
    line: "border-solid",
  },
  Buch: {
    article: "das",
    cls: "text-gender-n",
    es: "libro",
    plural: "die Bücher",
    line: "border-dotted",
  },
  Lampe: {
    article: "die",
    cls: "text-gender-f",
    es: "lámpara",
    plural: "die Lampen",
    line: "border-double",
  },
} as const;

type Noun = keyof typeof NOUNS;

function Word({
  noun,
  current,
  onPick,
}: {
  noun: Noun;
  current: Noun;
  onPick: (n: Noun) => void;
}) {
  const n = NOUNS[noun];
  const on = current === noun;
  return (
    <button
      type="button"
      onClick={() => onPick(noun)}
      aria-pressed={on}
      className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md px-1 align-middle font-semibold transition-colors ${n.cls} ${
        on ? "bg-accent-soft" : ""
      }`}
    >
      <span className={`border-b-[3px] ${n.line} border-current pb-px`}>
        {noun}
      </span>
    </button>
  );
}

/** Demostración táctil (RF-42): una página con tres sustantivos tocables. El género se ve por el
 * color, por el tipo de subrayado y por el artículo escrito (RNF-09). */
export function GenderDemo() {
  const [current, setCurrent] = useState<Noun>("Tisch");
  const n = NOUNS[current];
  return (
    <figure
      className="overflow-hidden rounded-card border border-border bg-surface"
      style={{ boxShadow: "var(--shadow-pop)" }}
    >
      <figcaption className="flex items-center justify-between border-b border-border px-5 py-3 text-sm text-muted">
        <span>Kapitel 3 · Zu Hause</span>
        <span className="tabular-nums">Seite 42</span>
      </figcaption>
      <div className="px-5 pb-6 pt-5 sm:px-7">
        <p
          lang="de"
          className="font-display text-[1.375rem] leading-[1.85] sm:text-2xl sm:leading-[1.85]"
        >
          Auf dem <Word noun="Tisch" current={current} onPick={setCurrent} />{" "}
          liegt ein <Word noun="Buch" current={current} onPick={setCurrent} />.
          Neben dem Buch steht eine{" "}
          <span className="whitespace-nowrap">
            <Word noun="Lampe" current={current} onPick={setCurrent} />.
          </span>
        </p>
      </div>
      <div
        className="border-t border-border bg-background px-5 py-4 sm:px-7"
        aria-live="polite"
      >
        <p
          key={current}
          className="pop-in flex flex-wrap items-baseline gap-x-3 gap-y-1"
        >
          <span className={`font-display text-2xl font-semibold ${n.cls}`}>
            {n.article} {current}
          </span>
          <span className="text-lg">{n.es}</span>
          <span className="text-sm text-muted">Plural: {n.plural}</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          Toca otro sustantivo para ver su género.
        </p>
      </div>
    </figure>
  );
}
