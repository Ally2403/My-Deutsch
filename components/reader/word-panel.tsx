"use client";

import { useEffect, useState } from "react";
import { splitSeparable } from "@/lib/domain/separable";
import { genderInfo } from "@/lib/domain/gender";
import { recordLookup } from "@/lib/domain/lookup-log";
import type { LexEntry, PageData } from "@/lib/domain/page";
import { MAX_SENSES } from "@/lib/domain/page";
import { seenSummary, type SeenWord } from "@/lib/domain/seen-words";
import {
  entryFor,
  formLabel,
  posLabel,
  sentenceOf,
} from "@/lib/domain/page-lookup";
import { Sheet } from "./sheet";

type Props = {
  page: PageData;
  tokenIndex: number;
  pageNumber: number;
  onClose: () => void;
  anchor: DOMRect | null;
  /** RF-28/RF-29: lo que se sabe de esta palabra en el diccionario personal. */
  seen?: SeenWord;
  firstBookTitle?: string;
  onStatus?: (lexiconId: number, status: SeenWord["status"]) => void;
  onRemove?: (lexiconId: number) => void;
  /** RF-25: busca de nuevo una forma corregida (una petición; solo para palabras sin entrada). */
  searchLexicon?: (word: string) => Promise<LexEntry | null>;
  /** RF-47: abre el panel de frase con la oración de esta palabra. */
  onTranslateSentence?: () => void;
};

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
  // RF-45: un verbo separable se escribe con punto medio (vor·gehen) para recordar que se separa.
  const parts = splitSeparable(entry.lemma, entry.pos);
  if (parts)
    return (
      <p className="text-xl font-semibold">
        <span aria-hidden="true">{parts.join("·")}</span>
        <span className="sr-only">{entry.lemma}, verbo separable</span>
      </p>
    );
  return <p className="text-xl font-semibold">{entry.lemma}</p>;
}

/** Palabra sin entrada (RF-25): dice «no sé», ofrece Wiktionary y DWDS y permite corregir la forma. */
function UnknownWord({
  form,
  searchLexicon,
}: {
  form: string;
  searchLexicon?: (word: string) => Promise<LexEntry | null>;
}) {
  const [query, setQuery] = useState(form);
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "none"; word: string }
    | { kind: "error" }
    | { kind: "found"; entry: LexEntry }
  >({ kind: "idle" });
  const word = query.trim();
  const link = "inline-flex min-h-11 items-center text-accent underline";

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!word || !searchLexicon) return;
    setState({ kind: "loading" });
    try {
      const entry = await searchLexicon(word);
      setState(entry ? { kind: "found", entry } : { kind: "none", word });
    } catch {
      setState({ kind: "error" });
    }
  }

  if (state.kind === "found") {
    const entry = state.entry;
    return (
      <>
        <Heading entry={entry} />
        <p className="mt-1 text-sm text-muted">{posLabel(entry.pos)}</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          {entry.senses.slice(0, MAX_SENSES).map((s, i) => (
            <li key={i}>{s.es}</li>
          ))}
        </ol>
        <button
          type="button"
          className="mt-3 min-h-11 underline"
          onClick={() => setState({ kind: "idle" })}
        >
          Corregir otra vez
        </button>
      </>
    );
  }

  return (
    <>
      <p className="text-xl font-semibold">{form}</p>
      <p className="mt-1 text-sm text-muted">
        No encontramos esta palabra en el diccionario.
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4">
        <a
          className={link}
          href={`https://de.wiktionary.org/wiki/${encodeURIComponent(word || form)}`}
          target="_blank"
          rel="noopener"
        >
          Buscar «{word || form}» en Wiktionary
        </a>
        <a
          className={link}
          href={`https://www.dwds.de/wb/${encodeURIComponent(word || form)}`}
          target="_blank"
          rel="noopener"
        >
          Buscar «{word || form}» en DWDS
        </a>
      </div>
      {searchLexicon && (
        <form onSubmit={search} className="mt-3 flex gap-2">
          <label className="sr-only" htmlFor="unknown-form">
            Corregir la forma de la palabra
          </label>
          <input
            id="unknown-form"
            lang="de"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-surface px-3"
          />
          <button
            type="submit"
            disabled={!word || state.kind === "loading"}
            className="pressable min-h-11 rounded-control bg-accent px-4 font-semibold text-on-accent disabled:opacity-60"
          >
            Buscar de nuevo
          </button>
        </form>
      )}
      {state.kind === "none" && (
        <p role="status" className="mt-2 text-sm text-muted">
          Tampoco encontramos «{state.word}».
        </p>
      )}
      {state.kind === "error" && (
        <p role="alert" className="mt-2 text-sm text-danger">
          No se pudo buscar. Revisa tu conexión e inténtalo de nuevo.
        </p>
      )}
    </>
  );
}

/** Panel de palabra (RF-21, RF-22): hoja inferior en móvil, tarjeta junto a la palabra desde 768 px. */
export function WordPanel({
  page,
  tokenIndex,
  pageNumber,
  onClose,
  anchor,
  seen,
  firstBookTitle,
  onStatus,
  onRemove,
  searchLexicon,
  onTranslateSentence,
}: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const token = page.tokens[tokenIndex];
  const entry = entryFor(page, tokenIndex);

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

  if (!token) return null;

  const form = bare(token.t);
  const formNote = entry && formLabel(token.f);
  const senses = entry?.senses.slice(0, MAX_SENSES) ?? [];

  return (
    <Sheet label={`Palabra: ${form}`} anchor={anchor} onClose={onClose}>
      {entry ? (
        <>
          <Heading entry={entry} />
          <p className="mt-1 text-sm text-muted">
            {posLabel(entry.pos)}
            {formNote && ` · ${form} → ${entry.lemma}, ${formNote}`}
            {entry.pos === "noun" && token.f === "pl" && (
              <span className="plural-badge ml-2">plural</span>
            )}
          </p>
          {senses.length === 0 && (
            <p className="mt-3 text-sm text-muted">
              Todavía no hay significados para esta palabra.
            </p>
          )}
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
          {token.l !== undefined && seen && (
            <div className="mt-4 border-t border-border pt-3">
              {seenSummary(seen, firstBookTitle) && (
                <p className="text-sm text-muted">
                  {seenSummary(seen, firstBookTitle)}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="chip"
                  onClick={() =>
                    onStatus?.(
                      token.l as number,
                      seen.status === "known" ? "seen" : "known",
                    )
                  }
                >
                  {seen.status === "known"
                    ? "Volver a «vista»"
                    : "Marcar como conocida"}
                </button>
                {confirmRemove ? (
                  <>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => {
                        onRemove?.(token.l as number);
                        setConfirmRemove(false);
                      }}
                    >
                      Sí, eliminar
                    </button>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => setConfirmRemove(false)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => setConfirmRemove(true)}
                  >
                    Eliminar de mi diccionario
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <UnknownWord form={form} searchLexicon={searchLexicon} />
      )}
      {onTranslateSentence && (
        <button
          type="button"
          className="chip mt-4"
          onClick={onTranslateSentence}
        >
          Traducir la oración
        </button>
      )}
    </Sheet>
  );
}
