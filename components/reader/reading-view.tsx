"use client";

import type { FontSize } from "@/lib/domain/prefs";
import type { Gender } from "@/lib/domain/gender";
import type { PageData } from "@/lib/domain/page";
import { cropStyle, readingBlocks } from "@/lib/domain/reading";

type Props = {
  page: PageData;
  imageUrl: string;
  fontSize: FontSize;
  onWordClick: (tokenIndex: number, rect: DOMRect) => void;
  active?: ReadonlySet<number>;
  highlight?: ReadonlyMap<number, Gender>;
  plurals?: ReadonlySet<number>;
  seen?: ReadonlyMap<number, "seen" | "known">;
};

/** RF-18: texto de la página como párrafos ajustados al ancho, con las mismas marcas que la vista original. */
export function ReadingView({
  page,
  imageUrl,
  fontSize,
  onWordClick,
  active,
  highlight,
  plurals,
  seen,
}: Props) {
  return (
    <div
      data-testid="reading-view"
      data-size={fontSize}
      lang="de"
      className="reading-view mx-auto max-w-2xl px-3 py-4"
    >
      {readingBlocks(page).map((block, n) =>
        block.kind === "image" ? (
          <div
            key={n}
            role="img"
            aria-label="Ilustración de la página"
            className="my-4 w-full rounded-control border border-border bg-no-repeat"
            style={{
              backgroundImage: `url(${imageUrl})`,
              ...cropStyle(block.box, page.size),
            }}
          />
        ) : (
          <p key={n} className="reading-paragraph">
            {block.tokens.map((i) => {
              const gender = highlight?.get(i);
              const cls = [
                "reading-word",
                active?.has(i) && "reader-word-active",
                gender && `hl-${gender}`,
                plurals?.has(i) && "pl-mark",
                seen?.has(i) && `seen-${seen.get(i)}`,
              ]
                .filter(Boolean)
                .join(" ");
              const activate = (el: HTMLElement) => onWordClick(i, el.getBoundingClientRect());
              return (
                <span key={i}>
                  <span
                    role="button"
                    tabIndex={0}
                    data-token={i}
                    className={cls}
                    onClick={(e) => activate(e.currentTarget)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        activate(e.currentTarget);
                      }
                    }}
                  >
                    {page.tokens[i].t}
                  </span>{" "}
                </span>
              );
            })}
          </p>
        ),
      )}
    </div>
  );
}
