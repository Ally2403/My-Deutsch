"use client";

import { useEffect, useState } from "react";
import { genderInfo } from "@/lib/domain/gender";
import type { PageData } from "@/lib/domain/page";
import {
  glossesFor,
  phraseText,
  sentencesCovering,
  sentencesFullyIn,
  type Gloss,
  type TokenRange,
} from "@/lib/domain/phrase";
import { translateFragment, type FragmentResult } from "@/lib/phrase-translate";
import { Sheet } from "./sheet";

type Props = {
  page: PageData;
  range: TokenRange;
  onClose: () => void;
  anchor?: DOMRect | null;
};

/** Artículo en color y escrito (RNF-09) delante del lema de un sustantivo. */
function GlossWord({ gloss }: { gloss: Gloss }) {
  const info = genderInfo({ pos: gloss.pos, genders: gloss.genders });
  if (info.kind === "colored") {
    const cls = `gender-${info.gender}`;
    return (
      <span className="font-semibold">
        {info.articles.map((a, i) => (
          <span key={a}>
            {i > 0 && "/"}
            <span className={cls}>{a}</span>
          </span>
        ))}{" "}
        <span className={cls}>{gloss.lemma}</span>
      </span>
    );
  }
  if (info.kind === "plural-only")
    return (
      <span className="font-semibold text-gender-none">die {gloss.lemma}</span>
    );
  return <span className="font-semibold">{gloss.lemma}</span>;
}

const FRAGMENT_ERRORS: Record<string, string> = {
  quota: "Se alcanzó el límite diario de traducciones de trozos.",
  network: "No se pudo traducir el trozo; revisa tu conexión.",
  too_long: "El trozo es muy largo para traducirlo de una vez.",
  empty: "",
};

/** Panel de frase (RF-47): texto original, traducción de lo seleccionado y glosas de sus palabras.
 * Si la selección contiene oraciones enteras se usa su traducción precalculada (sin red, RNF-01);
 * si es un trozo, se traduce ese trozo al momento (`translateFragment`). La oración completa queda
 * como ayuda aparte solo cuando el trozo no se pudo traducir. */
export function PhrasePanel({ page, range, onClose, anchor = null }: Props) {
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const text = phraseText(page, range);
  const glosses = glossesFor(page, range);
  const whole = sentencesFullyIn(page, range);
  const context = sentencesCovering(page, range).filter((s) => s.es !== null);
  const hasSents = (page.sents?.length ?? 0) > 0;
  const needsFragment = whole.length === 0;
  const [fragment, setFragment] = useState<{
    text: string;
    result: FragmentResult | null;
  }>({ text: "", result: null });

  useEffect(() => {
    if (!needsFragment || text === "") return;
    const ctrl = new AbortController();
    // Pequeña espera: mientras se arrastra la selección no se pide cada palabra.
    const timer = setTimeout(() => {
      void translateFragment(text, { signal: ctrl.signal }).then((result) => {
        if (!ctrl.signal.aborted) setFragment({ text, result });
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [needsFragment, text]);

  const fragmentDone = fragment.text === text ? fragment.result : null;
  const fragmentEs = fragmentDone?.ok ? fragmentDone.es : null;
  const fragmentError = fragmentDone && !fragmentDone.ok ? fragmentDone : null;
  const translated = whole.length > 0 ? whole : showFull ? context : [];

  async function copy() {
    const body = [text, ...translated.map((s) => s.es as string)].join("\n\n");
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Sheet label="Traducción de la frase" anchor={anchor} onClose={onClose}>
      <p lang="de" className="pr-10 text-lg font-semibold">
        {text}
      </p>

      {needsFragment && (
        <section aria-label="Traducción" className="mt-3 space-y-2">
          {fragmentEs && (
            <>
              <p>{fragmentEs}</p>
              <p className="text-sm text-muted">
                Traducción automática; puede fallar en frases idiomáticas.
              </p>
            </>
          )}
          {!fragmentDone && (
            <p role="status" className="text-sm text-muted">
              Traduciendo…
            </p>
          )}
          {fragmentError && FRAGMENT_ERRORS[fragmentError.reason] && (
            <p role="status" className="text-sm text-muted">
              {FRAGMENT_ERRORS[fragmentError.reason]}
            </p>
          )}
        </section>
      )}
      {translated.length > 0 && (
        <section
          aria-label={needsFragment ? "Oración completa" : "Traducción"}
          className="mt-3 space-y-2"
        >
          {whole.length === 0 && (
            <h2 className="text-sm font-semibold text-muted">
              Oración completa
            </h2>
          )}
          {translated.map((s) => (
            <p key={s.range[0]}>{s.es}</p>
          ))}
          {whole.length > 0 && (
            <p className="text-sm text-muted">
              Traducción automática; puede fallar en frases idiomáticas.
            </p>
          )}
        </section>
      )}
      {fragmentError &&
        translated.length === 0 &&
        hasSents &&
        context.length > 0 && (
          <button
            type="button"
            className="chip mt-3"
            onClick={() => setShowFull(true)}
          >
            Ver la oración completa
          </button>
        )}

      {!hasSents && (
        <p className="mt-3 text-sm text-muted">
          Sube de nuevo el libro para traducir oraciones completas.
        </p>
      )}

      {glosses.length > 0 && (
        <section
          aria-label="Palabras"
          className="mt-4 border-t border-border pt-3"
        >
          <h2 className="text-sm font-semibold text-muted">Palabras</h2>
          <ul className="mt-2 space-y-1">
            {glosses.map((g) => (
              <li key={g.token}>
                <GlossWord gloss={g} /> <span aria-hidden="true">·</span> {g.es}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button type="button" className="chip" onClick={copy}>
          Copiar
        </button>
        <span role="status" aria-live="polite" className="text-sm text-muted">
          {copied ? "Copiado" : ""}
        </span>
      </div>
    </Sheet>
  );
}
