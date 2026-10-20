import type { Metadata } from "next";
import { Page } from "@/components/ui";
import type { DictWord } from "@/lib/domain/dictionary";
import { ReviewSession } from "../review-session";

export const metadata: Metadata = { title: "Repaso de ejemplo · My-Deutsch" };

const base = {
  status: "seen" as const,
  lookups: 1,
  bookId: "demo",
  lastSeenAt: "2026-10-01T00:00:00Z",
};

/** Palabras sintéticas (sin sesión): sirve para las pruebas e2e; no guarda nada en la base. */
const WORDS: DictWord[] = [
  {
    ...base,
    lexiconId: 1,
    lemma: "Haus",
    pos: "noun",
    genders: ["n"],
    plural: "Häuser",
    glosses: ["casa"],
    page: 3,
    sentence: "Das Haus ist sehr alt.",
    firstSeenAt: "2026-10-01T00:00:01Z",
  },
  {
    ...base,
    lexiconId: 2,
    lemma: "Tisch",
    pos: "noun",
    genders: ["m"],
    plural: "Tische",
    glosses: ["mesa"],
    page: 4,
    sentence: "Der Tisch steht in der Küche.",
    firstSeenAt: "2026-10-01T00:00:02Z",
  },
  {
    ...base,
    lexiconId: 3,
    lemma: "Lampe",
    pos: "noun",
    genders: ["f"],
    plural: "Lampen",
    glosses: ["lámpara"],
    page: 4,
    sentence: "Die Lampe brennt noch.",
    firstSeenAt: "2026-10-01T00:00:03Z",
  },
  {
    ...base,
    lexiconId: 4,
    lemma: "gehen",
    pos: "verb",
    genders: [],
    plural: null,
    glosses: ["ir", "caminar"],
    page: 5,
    sentence: "Er geht nach Hause.",
    firstSeenAt: "2026-10-01T00:00:04Z",
  },
];

export default function RepasoDemoPage() {
  return (
    <Page>
      <h1 className="font-display text-3xl font-extrabold">Repaso</h1>
      <ReviewSession
        userId={null}
        demo
        words={WORDS}
        cards={{}}
        books={{ demo: "Libro de ejemplo" }}
        recentLogs={[]}
      />
    </Page>
  );
}
