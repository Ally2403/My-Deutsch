"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button, Input, OutlineButton } from "@/components/ui";
import {
  countBy,
  filterWords,
  filtersFromParams,
  filtersToParams,
  sortWords,
  type DictWord,
  type Filters,
  type GenderFilter,
  type PosFilter,
  type WordStatus,
} from "@/lib/domain/dictionary";
import { genderInfo } from "@/lib/domain/gender";
import { posLabel } from "@/lib/domain/page-lookup";
import { createClient } from "@/lib/supabase/client";

const ROW_H = 76;
const OVERSCAN = 6;

const POS_OPTIONS: { value: PosFilter; label: string }[] = [
  { value: "noun", label: "Sustantivos" },
  { value: "verb", label: "Verbos" },
  { value: "adj", label: "Adjetivos" },
  { value: "adv", label: "Adverbios" },
  { value: "other", label: "Otros" },
];
const GENDER_OPTIONS: { value: GenderFilter; label: string; cls: string }[] = [
  { value: "m", label: "der", cls: "text-gender-m" },
  { value: "n", label: "das", cls: "text-gender-n" },
  { value: "f", label: "die", cls: "text-gender-f" },
];
const STATUS_OPTIONS: { value: WordStatus; label: string }[] = [
  { value: "seen", label: "Vistas" },
  { value: "known", label: "Conocidas" },
];

const GENDER_CLASS = {
  m: "text-gender-m",
  n: "text-gender-n",
  f: "text-gender-f",
} as const;

function Article({ word }: { word: DictWord }) {
  const info = genderInfo({ pos: word.pos, genders: word.genders });
  if (info.kind !== "colored") return null;
  return (
    <>
      <span className={`font-semibold ${GENDER_CLASS[info.gender]}`}>
        {info.articles.join("/")}
      </span>{" "}
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`pressable min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${
        active ? "border-accent bg-accent-soft" : "border-border bg-surface"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DictionaryView({
  userId,
  initialWords,
  books,
  initialQuery,
}: {
  userId: string;
  initialWords: DictWord[];
  books: Record<string, string>;
  initialQuery: string;
}) {
  const [words, setWords] = useState(initialWords);
  const [filters, setFilters] = useState<Filters>(() =>
    filtersFromParams(new URLSearchParams(initialQuery)),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  function update(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    // RF-31 c3: los filtros viven en la URL (sin recargar).
    const qs = filtersToParams(next).toString();
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
    if (listRef.current) listRef.current.scrollTop = 0;
    setScrollTop(0);
  }

  const { q, pos, gender, status, bookId, order } = filters;
  const criteria = useMemo(
    () => ({ q, pos, gender, status, bookId }),
    [q, pos, gender, status, bookId],
  );
  const visible = useMemo(
    () => sortWords(filterWords(words, criteria), order),
    [words, criteria, order],
  );
  const posCounts = useMemo(() => countBy(words, criteria, "pos"), [words, criteria]);
  const genderCounts = useMemo(() => countBy(words, criteria, "gender"), [words, criteria]);
  const statusCounts = useMemo(() => countBy(words, criteria, "status"), [words, criteria]);
  const bookCounts = useMemo(() => countBy(words, criteria, "bookId"), [words, criteria]);

  const selected = words.find((w) => w.lexiconId === selectedId) ?? null;

  const viewport = 520;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const end = Math.min(
    visible.length,
    Math.ceil((scrollTop + viewport) / ROW_H) + OVERSCAN,
  );

  async function setStatus(w: DictWord, status: WordStatus) {
    setBusy(true);
    setError(null);
    const { error: e } = await createClient()
      .from("user_words")
      .update({ status })
      .eq("user_id", userId)
      .eq("lexicon_id", w.lexiconId);
    setBusy(false);
    if (e) return setError("No se pudo cambiar el estado. Inténtalo de nuevo.");
    setWords((all) =>
      all.map((x) => (x.lexiconId === w.lexiconId ? { ...x, status } : x)),
    );
  }

  async function remove(w: DictWord) {
    setBusy(true);
    setError(null);
    const { error: e } = await createClient()
      .from("user_words")
      .delete()
      .eq("user_id", userId)
      .eq("lexicon_id", w.lexiconId);
    setBusy(false);
    if (e)
      return setError("No se pudo eliminar la palabra. Inténtalo de nuevo.");
    setWords((all) => all.filter((x) => x.lexiconId !== w.lexiconId));
    setSelectedId(null);
    setConfirmDelete(false);
  }

  if (words.length === 0)
    return (
      <div className="card mt-4 p-5">
        <p className="font-semibold">Aún no tienes palabras.</p>
        <p className="mt-1 text-muted">
          Abre un libro y toca una palabra: se guarda aquí sola.
        </p>
        <Link
          href="/grupos"
          className="pressable mt-4 inline-flex min-h-11 items-center rounded-control bg-accent px-5 font-semibold text-on-accent"
        >
          Ir a mis libros
        </Link>
      </div>
    );

  return (
    <div className="mt-4">
      <label className="sr-only" htmlFor="dict-search">
        Buscar en alemán o en español
      </label>
      <Input
        id="dict-search"
        type="search"
        placeholder="Buscar en alemán o en español"
        value={filters.q}
        onChange={(e) => update({ q: e.target.value })}
      />

      <div
        className="mt-3 flex gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label="Tipo de palabra"
      >
        {POS_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            active={filters.pos === o.value}
            onClick={() =>
              update({ pos: filters.pos === o.value ? null : o.value })
            }
          >
            {o.label} · {posCounts[o.value] ?? 0}
          </Chip>
        ))}
      </div>
      <div
        className="mt-1 flex gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label="Género y estado"
      >
        {GENDER_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            active={filters.gender === o.value}
            className={o.cls}
            onClick={() =>
              update({ gender: filters.gender === o.value ? null : o.value })
            }
          >
            {o.label} · {genderCounts[o.value] ?? 0}
          </Chip>
        ))}
        {STATUS_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            active={filters.status === o.value}
            onClick={() =>
              update({ status: filters.status === o.value ? null : o.value })
            }
          >
            {o.label} · {statusCounts[o.value] ?? 0}
          </Chip>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {Object.keys(books).length > 0 && (
          <>
            <label className="sr-only" htmlFor="dict-book">
              Libro
            </label>
            <select
              id="dict-book"
              value={filters.bookId ?? ""}
              onChange={(e) => update({ bookId: e.target.value || null })}
              className="min-h-11 rounded-control border border-border bg-surface px-3"
            >
              <option value="">Todos los libros</option>
              {Object.entries(books).map(([id, title]) => (
                <option key={id} value={id}>
                  {title} · {bookCounts[id] ?? 0}
                </option>
              ))}
            </select>
          </>
        )}
        <label className="sr-only" htmlFor="dict-order">
          Ordenar por
        </label>
        <select
          id="dict-order"
          value={filters.order}
          onChange={(e) =>
            update({ order: e.target.value as Filters["order"] })
          }
          className="min-h-11 rounded-control border border-border bg-surface px-3"
        >
          <option value="recent">Más recientes</option>
          <option value="alpha">A–Z</option>
          <option value="lookups">Más consultadas</option>
        </select>
        <p className="text-sm text-muted" aria-live="polite">
          {visible.length} de {words.length} palabras
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-muted">
          Ninguna palabra coincide.{" "}
          <button
            type="button"
            className="tap-link underline"
            onClick={() =>
              update({
                q: "",
                pos: null,
                gender: null,
                status: null,
                bookId: null,
              })
            }
          >
            Quitar filtros
          </button>
        </p>
      ) : (
        <div
          ref={listRef}
          data-testid="dict-list"
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          className="card mt-4 overflow-y-auto overscroll-contain"
          style={{ height: "min(65dvh, 520px)" }}
        >
          <ul style={{ height: visible.length * ROW_H, position: "relative" }}>
            {visible.slice(start, end).map((w, i) => (
              <li
                key={w.lexiconId}
                style={{
                  position: "absolute",
                  top: (start + i) * ROW_H,
                  height: ROW_H,
                  left: 0,
                  right: 0,
                }}
                className="border-b border-border last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(w.lexiconId);
                    setConfirmDelete(false);
                    setError(null);
                  }}
                  className="pressable flex size-full flex-col justify-center px-4 text-left"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-display text-lg font-bold">
                      <Article word={w} />
                      {w.lemma}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {w.status === "known" ? "conocida · " : ""}×{w.lookups}
                    </span>
                  </span>
                  <span className="truncate text-sm text-muted">
                    {w.glosses[0] ?? "sin traducción"} ·{" "}
                    {formatDate(w.firstSeenAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected && (
        <div
          role="dialog"
          aria-label={`Palabra: ${selected.lemma}`}
          className="card fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[75dvh] max-w-2xl overflow-auto rounded-b-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">
                <Article word={selected} />
                {selected.lemma}
              </h2>
              <p className="text-sm text-muted">
                {posLabel(selected.pos)}
                {selected.plural ? ` · plural: ${selected.plural}` : ""} ·
                consultada {selected.lookups}{" "}
                {selected.lookups === 1 ? "vez" : "veces"}
              </p>
            </div>
            <OutlineButton
              onClick={() => setSelectedId(null)}
              aria-label="Cerrar"
            >
              Cerrar
            </OutlineButton>
          </div>
          <ol className="mt-3 list-decimal pl-5">
            {selected.glosses.length === 0 && <li>sin traducción</li>}
            {selected.glosses.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ol>
          {selected.sentence && (
            <blockquote className="mt-3 border-l-4 border-accent pl-3 italic">
              {selected.sentence}
            </blockquote>
          )}
          {selected.bookId && selected.page && (
            <Link
              className="tap-link mt-2 inline-block underline"
              href={`/libros/${selected.bookId}?pagina=${selected.page}`}
            >
              Ver en {books[selected.bookId] ?? "el libro"}, página{" "}
              {selected.page}
            </Link>
          )}
          {error && (
            <p role="alert" className="mt-3 text-danger">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              loading={busy}
              onClick={() =>
                setStatus(
                  selected,
                  selected.status === "known" ? "seen" : "known",
                )
              }
            >
              {selected.status === "known"
                ? "Volver a «vista»"
                : "Marcar como conocida"}
            </Button>
            {confirmDelete ? (
              <>
                <OutlineButton disabled={busy} onClick={() => remove(selected)}>
                  Sí, eliminar
                </OutlineButton>
                <OutlineButton onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </OutlineButton>
              </>
            ) : (
              <OutlineButton onClick={() => setConfirmDelete(true)}>
                Eliminar
              </OutlineButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
