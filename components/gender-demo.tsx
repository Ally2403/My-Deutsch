"use client";

import { useState } from "react";

const WORDS = [
  { word: "Tisch", article: "der", cls: "text-gender-m", es: "mesa", mark: "borde sólido" },
  { word: "Buch", article: "das", cls: "text-gender-n", es: "libro", mark: "borde punteado" },
  { word: "Lampe", article: "die", cls: "text-gender-f", es: "lámpara", mark: "borde doble" },
] as const;

const UNDERLINE = {
  der: "border-b-[3px] border-solid",
  das: "border-b-[3px] border-dotted",
  die: "border-b-4 border-double",
} as const;

/** Demostración táctil de los colores de género (RF-42): el género no depende solo del color. */
export function GenderDemo() {
  const [i, setI] = useState(0);
  const w = WORDS[i];
  return (
    <div className="card p-4" aria-live="polite">
      <p className="text-sm text-muted">Toca una palabra</p>
      <div className="mt-2 flex gap-2">
        {WORDS.map((x, idx) => (
          <button
            key={x.word}
            type="button"
            onClick={() => setI(idx)}
            aria-pressed={i === idx}
            className={`pressable min-h-11 flex-1 rounded-control border px-2 font-display text-lg font-semibold ${x.cls} ${
              i === idx ? "border-current bg-accent-soft" : "border-border bg-surface"
            }`}
          >
            <span className={`${UNDERLINE[x.article]} border-current`}>{x.word}</span>
          </button>
        ))}
      </div>
      <p key={w.word} className="pop-in mt-3 text-lg">
        <span className={`font-display font-bold ${w.cls}`}>
          {w.article} {w.word}
        </span>{" "}
        <span className="text-muted">= {w.es}</span>
      </p>
    </div>
  );
}
