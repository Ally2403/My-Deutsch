import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DictWord } from "@/lib/domain/dictionary";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/supabase/review-store", () => ({
  supabaseReviewStore: () => ({ save: async () => {} }),
}));

import { ReviewSession } from "./review-session";

const word = (i: number, o: Partial<DictWord> = {}): DictWord => ({
  lexiconId: i,
  lemma: `Wort${i}`,
  pos: "noun",
  genders: ["f"],
  plural: `Wörter${i}`,
  glosses: [`palabra ${i}`],
  status: "seen",
  lookups: 1,
  bookId: "b1",
  page: 3,
  sentence: `Das ist Wort${i}.`,
  firstSeenAt: new Date(2026, 0, 1, 0, 0, i).toISOString(),
  lastSeenAt: "2026-10-01T00:00:00Z",
  ...o,
});

function setup(words: DictWord[], extra: Record<string, unknown> = {}) {
  const sync = {
    submit: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
  };
  const markKnown = vi.fn().mockResolvedValue(undefined);
  const utils = render(
    <ReviewSession
      userId="u1"
      words={words}
      cards={{}}
      books={{ b1: "Der Schatz" }}
      recentLogs={[]}
      initialQuery=""
      sync={sync}
      markKnown={markKnown}
      {...extra}
    />,
  );
  return { sync, markKnown, ...utils };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("RF-48 sesión de repaso", () => {
  it("muestra solo el primer significado, al frente y al reverso", () => {
    setup([word(1, { glosses: ["casa", "hogar", "vivienda"] })]);
    expect(screen.getByText("casa")).toBeTruthy();
    expect(screen.queryByText(/hogar|vivienda/)).toBeNull();
    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByText("casa")).toBeTruthy();
    expect(screen.queryByText(/hogar|vivienda/)).toBeNull();
  });

  it("voltea con Espacio y califica con la tecla 3: avanza y guarda la reseña", async () => {
    const { sync } = setup([word(1), word(2)]);
    expect(screen.getByText("1 de 2")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Bien/ })).toBeNull();
    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByText("Wort1")).toBeTruthy(); // reverso con el lema
    fireEvent.keyDown(window, { key: "3" });
    expect(screen.getByText("2 de 2")).toBeTruthy();
    // La reseña se confirma al calificar la siguiente (o al pasar la ventana de «Deshacer»).
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "3" });
    await act(async () => {});
    expect(sync.submit).toHaveBeenCalledTimes(1);
    expect(sync.submit.mock.calls[0][0]).toMatchObject({ lexiconId: 1 });
    expect(screen.getByText("Terminaste por hoy")).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(7000);
    });
    expect(sync.submit).toHaveBeenCalledTimes(2);
  });

  it("deshacer restaura la tarjeta y no guarda la reseña", async () => {
    const { sync } = setup([word(1), word(2)]);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar respuesta" }));
    fireEvent.click(screen.getByRole("button", { name: /^Bien/ }));
    expect(screen.getByText("2 de 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByText("1 de 2")).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(sync.submit).not.toHaveBeenCalled();
  });

  it("«Otra vez» vuelve a mostrar la tarjeta al final de la sesión", () => {
    setup([word(1)]);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar respuesta" }));
    fireEvent.click(screen.getByRole("button", { name: /^Otra vez/ }));
    expect(screen.getByText("2 de 2")).toBeTruthy();
    expect(screen.queryByText("Terminaste por hoy")).toBeNull();
  });

  it("el reverso muestra el artículo en texto además de color (RNF-09)", () => {
    setup([word(1)]);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar respuesta" }));
    const art = screen.getByTestId("card-article");
    expect(art.textContent).toBe("die");
    expect(art.className).toContain("text-gender-f");
  });

  it("marcar «conocida» a mitad de sesión la saca de la cola", async () => {
    const { markKnown } = setup([word(1), word(2), word(3)]);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar respuesta" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Ya la sé" }));
    });
    expect(markKnown).toHaveBeenCalledWith(1);
    expect(screen.getByText("1 de 2")).toBeTruthy();
    expect(screen.queryByText("Wort1")).toBeNull();
  });

  it("los filtros cambian la cola y quedan en la URL", () => {
    setup([word(1, { genders: ["m"] }), word(2, { genders: ["f"] })]);
    expect(screen.getByText("1 de 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^der/ }));
    expect(screen.getByText("1 de 1")).toBeTruthy();
    expect(window.location.search).toContain("genero=m");
  });

  it("sin palabras: estado vacío que invita a leer", () => {
    setup([]);
    expect(screen.getByText(/Aún no tienes palabras/)).toBeTruthy();
  });

  it("con palabras pero sin nada pendiente: «Estás al día»", () => {
    setup([word(1)], {
      cards: {
        1: {
          due: new Date(Date.now() + 10 * 86_400_000).toISOString(),
          stability: 5,
          difficulty: 5,
          elapsed_days: 1,
          scheduled_days: 10,
          reps: 3,
          lapses: 0,
          state: 2,
          last_review: new Date().toISOString(),
        },
      },
    });
    expect(screen.getByText("Estás al día")).toBeTruthy();
  });
});
