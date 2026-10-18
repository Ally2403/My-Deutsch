"use client";

import { Fragment } from "react";
import type { Gender } from "@/lib/domain/gender";
import type { Box, PageData } from "@/lib/domain/page";

type Props = {
  page: PageData;
  onWordClick: (tokenIndex: number, rect: DOMRect) => void;
  /** Palabras resaltadas, p. ej. la consultada y su pareja de verbo separable (RN-07). */
  active?: ReadonlySet<number>;
  /** Género de los sustantivos a resaltar (RF-26); sin él no se colorea nada. */
  highlight?: ReadonlyMap<number, Gender>;
  /** Sustantivos en plural a marcar en amarillo (RF-41). */
  plurals?: ReadonlySet<number>;
};

const pct = (v: number) => `${+(v * 100).toFixed(3)}%`;

function boxStyle([x, y, w, h]: Box) {
  return { left: pct(x), top: pct(y), width: pct(w), height: pct(h) };
}

/** Capa de texto transparente sobre la imagen: cada palabra ocupa su posición (RF-17). */
export function TextLayer({ page, onWordClick, active, highlight, plurals }: Props) {
  const lineEnds = new Set(page.lines.map(([, last]) => last));

  return (
    <div className="reader-text-layer" lang="de">
      {page.tokens.map((token, i) => {
        const activate = (el: HTMLElement) =>
          onWordClick(i, el.getBoundingClientRect());
        const gender = highlight?.get(i);
        const cls = [
          "reader-word",
          active?.has(i) && "reader-word-active",
          gender && `hl-${gender}`,
          plurals?.has(i) && "pl-mark",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <Fragment key={i}>
            <span
              role="button"
              tabIndex={0}
              data-token={i}
              className={cls}
              style={boxStyle(token.b)}
              onClick={(e) => activate(e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activate(e.currentTarget);
                }
              }}
            >
              {token.t}{" "}
            </span>
            {token.b2 && (
              <span
                aria-hidden="true"
                data-token={i}
                className={cls}
                style={boxStyle(token.b2)}
                onClick={(e) => activate(e.currentTarget)}
              />
            )}{" "}
            {lineEnds.has(i) && <br />}
          </Fragment>
        );
      })}
    </div>
  );
}
