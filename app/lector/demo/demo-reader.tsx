"use client";

import { useEffect, useState } from "react";
import { createAnnotationSync, type AnnotationSync } from "@/lib/annotations/sync";
import { createDemoRemote } from "@/lib/annotations/demo-remote";
import { createIdbStore } from "@/lib/annotations/idb-store";
import { PageReader } from "@/components/reader/page-reader";
import { parsePage } from "@/lib/domain/page";
import type { SeenWord } from "@/lib/domain/seen-words";

const TOTAL = 3;

/** Búsqueda de ejemplo (RF-25) sin red: solo conoce «Katze». */
async function searchLexicon(word: string) {
  if (word.trim().toLowerCase() !== "katze") return null;
  return {
    lemma: "Katze",
    pos: "noun",
    g: ["f" as const],
    pl: "Katzen",
    senses: [{ es: "gato", m: false }],
  };
}

async function loadPage(n: number) {
  const res = await fetch(`/demo/page-${n}.json`);
  if (!res.ok) throw new Error(`No se pudo cargar la página ${n}`);
  return parsePage(await res.json());
}

const imageUrl = (n: number) => `/demo/page-${n}.webp`;

/** Diccionario de ejemplo para ver las marcas de palabras vistas (RF-28) sin iniciar sesión. */
const INITIAL_SEEN: [number, SeenWord][] = [
  [101, { status: "seen", lookups: 3, bookId: "demo", page: 1 }], // Tisch
  [431, { status: "known", lookups: 2, bookId: "demo", page: 1 }], // Haus
];

export function DemoReader() {
  const [seen, setSeen] = useState<ReadonlyMap<number, SeenWord>>(() => new Map(INITIAL_SEEN));
  // RF-33 / RNF-14 sin sesión: IndexedDB local y un «servidor» simulado.
  const [annotations, setAnnotations] = useState<AnnotationSync>();
  useEffect(() => {
    const sync = createAnnotationSync({
      store: createIdbStore("md-annotations:demo"),
      remote: createDemoRemote(),
    });
    setAnnotations(sync); // eslint-disable-line react-hooks/set-state-in-effect
    const flush = () => void sync.flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);
  return (
    <PageReader
      annotations={annotations}
      total={TOTAL}
      loadPage={loadPage}
      imageUrl={imageUrl}
      seenWords={seen}
      searchLexicon={searchLexicon}
      seenBookTitles={{ demo: "Libro de ejemplo" }}
      onSeenStatus={(id, status) =>
        setSeen((m) => {
          const old = m.get(id);
          return old ? new Map(m).set(id, { ...old, status }) : m;
        })
      }
      onSeenRemove={(id) =>
        setSeen((m) => {
          const next = new Map(m);
          next.delete(id);
          return next;
        })
      }
    />
  );
}
