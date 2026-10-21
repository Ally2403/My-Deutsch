"use client";

import { useState } from "react";
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

/** Panel de frase (RF-47): texto original, glosas de sus palabras y la traducción precalculada de
 * las oraciones que la selección contiene por completo. Si solo se eligió un trozo, la oración
 * entera se ofrece aparte («Ver la oración completa»). No hace peticiones de red (RNF-01). */
export function PhrasePanel({ page, range, onClose, anchor = null }: Props) {
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const text = phraseText(page, range);
  const glosses = glossesFor(page, range);
  const whole = sentencesFullyIn(page, range);
  const context = sentencesCovering(page, range).filter((s) => s.es !== null);
  const hasSents = (page.sents?.length ?? 0) > 0;
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

      {translated.length > 0 && (
        <section aria-label="Traducción" className="mt-3 space-y-2">
          {whole.length === 0 && (
            <h2 className="text-sm font-semibold text-muted">
              Oración completa
            </h2>
          )}
          {translated.map((s) => (
            <p key={s.range[0]}>{s.es}</p>
          ))}
          <p className="text-sm text-muted">
            Traducción automática; puede fallar en frases idiomáticas.
          </p>
        </section>
      )}
      {translated.length === 0 && hasSents && context.length > 0 && (
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
