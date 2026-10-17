"use client";

import { useEffect, useRef } from "react";
import { genderInfo } from "@/lib/domain/gender";
import { recordLookup } from "@/lib/domain/lookup-log";
import type { LexEntry, PageData } from "@/lib/domain/page";
import { MAX_SENSES } from "@/lib/domain/page";
import {
  entryFor,
  formLabel,
  posLabel,
  sentenceOf,
} from "@/lib/domain/page-lookup";

type Props = {
  page: PageData;
  tokenIndex: number;
  pageNumber: number;
  onClose: () => void;
  anchor: DOMRect | null;
};

const CLOSE_SWIPE_PX = 60;
const CARD_WIDTH = 384;

/** Quita la puntuación pegada al token (p. ej. «Berlin.» → «Berlin»). */
const bare = (t: string) => t.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");

function Heading({ entry }: { entry: LexEntry }) {
  const info = genderInfo({ pos: entry.pos, genders: entry.g ?? [] });
  if (info.kind === "colored") {
    const cls = `gender-${info.gender}`;
    return (
      <p className="text-xl font-semibold">
        {info.articles.map((a, i) => (
          <span key={a}>
            {i > 0 && "/"}
            <span className={cls}>{a}</span>
          </span>
        ))}{" "}
        <span className={cls}>{entry.lemma}</span>
        {entry.pl ? `, die ${entry.pl}` : ""}
        {info.multiple && (
          <span className="ml-2 text-sm font-normal text-muted">
            varios géneros
          </span>
        )}
      </p>
    );
  }
  if (info.kind === "plural-only") {
    return (
      <p className="text-xl font-semibold text-gender-none">
        die {entry.lemma}
        <span className="ml-2 text-sm font-normal">solo plural</span>
      </p>
    );
  }
  return <p className="text-xl font-semibold">{entry.lemma}</p>;
}

/** Panel de palabra (RF-21, RF-22): hoja inferior en móvil, tarjeta junto a la palabra desde 768 px. */
export function WordPanel({
  page,
  tokenIndex,
  pageNumber,
  onClose,
  anchor,
}: Props) {
  const token = page.tokens[tokenIndex];
  const entry = entryFor(page, tokenIndex);
  const ref = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // RN-05: registrar la consulta al abrir el panel.
  useEffect(() => {
    const t = page.tokens[tokenIndex];
    const e = entryFor(page, tokenIndex);
    if (!t || t.l === undefined || !e) return;
    recordLookup({
      lexiconId: t.l,
      lemma: e.lemma,
      pos: e.pos,
      page: pageNumber,
      sentence: sentenceOf(page, tokenIndex),
    });
  }, [page, tokenIndex, pageNumber]);

  // Esc cierra; el foco entra al panel y vuelve a la palabra al cerrar.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  if (!token) return null;

  const wide =
    typeof window !== "undefined" &&
    window.matchMedia?.("(min-width: 768px)").matches;
  let cardStyle: React.CSSProperties | undefined;
  if (wide && anchor) {
    const left = Math.min(
      Math.max(anchor.left, 8),
      window.innerWidth - CARD_WIDTH - 8,
    );
    const below = anchor.bottom + 8 + 240 < window.innerHeight;
    cardStyle = below
      ? { left, top: anchor.bottom + 8, width: CARD_WIDTH }
      : {
          left,
          bottom: window.innerHeight - anchor.top + 8,
          width: CARD_WIDTH,
        };
  }

  const form = bare(token.t);
  const formNote = entry && formLabel(token.f);
  const senses = entry?.senses.slice(0, MAX_SENSES) ?? [];

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onPointerDown={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-label={`Palabra: ${form}`}
        tabIndex={-1}
        style={cardStyle}
        className={
          "fixed z-50 border border-border bg-background p-4 shadow-xl outline-none " +
          (cardStyle
            ? "rounded-xl"
            : "inset-x-0 bottom-0 max-h-[70dvh] overflow-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]")
        }
      >
        <div
          data-testid="panel-handle"
          className="mx-auto mb-3 flex h-6 w-full touch-none justify-center md:hidden"
          onPointerDown={(e) => {
            dragStart.current = e.clientY;
          }}
          onPointerUp={(e) => {
            const start = dragStart.current;
            dragStart.current = null;
            if (start !== null && e.clientY - start >= CLOSE_SWIPE_PX)
              onClose();
          }}
        >
          <span className="mt-1 h-1.5 w-10 rounded-full bg-border" />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 min-h-11 min-w-11 rounded text-lg"
        >
          <span aria-hidden="true">×</span>
          <span className="sr-only">Cerrar</span>
        </button>

        {entry ? (
          <>
            <Heading entry={entry} />
            <p className="mt-1 text-sm text-muted">
              {posLabel(entry.pos)}
              {formNote && ` · ${form} → ${entry.lemma}, ${formNote}`}
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5">
              {senses.map((s, i) => (
                <li key={i}>
                  {s.es}
                  {s.m && (
                    <span className="ml-2 rounded border border-border px-1 text-xs text-muted">
                      traducción automática
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <p className="text-xl font-semibold">{form}</p>
            <p className="mt-1 text-sm text-muted">
              No encontramos esta palabra en el diccionario.
            </p>
            <a
              className="mt-3 inline-flex min-h-11 items-center text-accent underline"
              href={`https://de.wiktionary.org/wiki/${encodeURIComponent(form)}`}
              target="_blank"
              rel="noopener"
            >
              Buscar «{form}» en Wiktionary
            </a>
          </>
        )}
      </div>
    </>
  );
}
