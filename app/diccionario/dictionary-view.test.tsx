import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DictWord } from "@/lib/domain/dictionary";

const calls: { op: string; patch?: unknown }[] = [];
let failNext = false;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: (patch: unknown) => ({
        eq: () => ({
          eq: async () => {
            calls.push({ op: "update", patch });
            return { error: failNext ? new Error("x") : null };
          },
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: async () => {
            calls.push({ op: "delete" });
            return { error: null };
          },
        }),
      }),
    }),
  }),
}));

import { DictionaryView } from "./dictionary-view";

const word = (i: number, o: Partial<DictWord> = {}): DictWord => ({
  lexiconId: i,
  lemma: `Wort${i}`,
  pos: "noun",
  genders: ["f"],
  plural: null,
  glosses: [`palabra ${i}`],
  status: "seen",
  lookups: 1,
  bookId: "b1",
  page: 3,
  sentence: `Das ist Wort${i}.`,
  firstSeenAt: new Date(2026, 9, 1, 0, 0, i % 59).toISOString(),
  lastSeenAt: "2026-10-01T00:00:00Z",
  ...o,
});

const many = Array.from({ length: 2000 }, (_, i) => word(i + 1));

function setup(words = many, query = "") {
  return render(
    <DictionaryView
      userId="u"
      initialWords={words}
      books={{ b1: "Der Schatz" }}
      initialQuery={query}
    />,
  );
}

beforeEach(() => {
  calls.length = 0;
  failNext = false;
  window.history.replaceState(null, "", "/diccionario");
});

describe("DictionaryView (RF-30, RF-31, RF-29)", () => {
  it("con 2 000 palabras solo dibuja una ventana de filas (virtualizado)", () => {
    setup();
    const rows = screen.getAllByRole("listitem");
    expect(rows.length).toBeLessThan(40);
    expect(screen.getByText("2000 de 2000 palabras")).toBeInTheDocument();
  });

  it("muestra el artículo escrito además del color y la traducción principal", () => {
    setup([word(1, { lemma: "Frau", glosses: ["mujer"] })]);
    expect(screen.getByRole("button", { name: /die Frau/ })).toBeInTheDocument();
    expect(screen.getByText(/mujer/)).toBeInTheDocument();
  });

  it("busca por parcial sin distinguir mayúsculas, ß/ss ni tildes", () => {
    setup([
      word(1, { lemma: "Straße", glosses: ["calle"] }),
      word(2, { lemma: "Haus", glosses: ["casa"] }),
    ]);
    fireEvent.change(screen.getByLabelText("Buscar en alemán o en español"), {
      target: { value: "STRASSE" },
    });
    expect(screen.getByText("1 de 2 palabras")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar en alemán o en español"), {
      target: { value: "cás" },
    });
    expect(screen.getByText(/Haus/)).toBeInTheDocument();
  });

  it("los filtros se combinan, muestran conteos y se guardan en la URL", () => {
    setup([
      word(1, { lemma: "Frau", genders: ["f"] }),
      word(2, { lemma: "gehen", pos: "verb", genders: [] }),
      word(3, { lemma: "Haus", genders: ["n"], status: "known" }),
    ]);
    expect(
      screen.getByRole("button", { name: "Sustantivos · 2" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sustantivos · 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Vistas · 1" }));
    expect(screen.getByText("1 de 3 palabras")).toBeInTheDocument();
    expect(window.location.search).toContain("tipo=noun");
    expect(window.location.search).toContain("estado=seen");
  });

  it("arranca con los filtros de la URL", () => {
    setup(
      [
        word(1, { lemma: "Frau" }),
        word(2, { lemma: "gehen", pos: "verb", genders: [] }),
      ],
      "tipo=verb",
    );
    expect(screen.getByText("1 de 2 palabras")).toBeInTheDocument();
  });

  it("el detalle muestra significados, oración y enlace a la página; marca como conocida", async () => {
    setup([word(1, { lemma: "Frau", glosses: ["mujer", "señora"] })]);
    fireEvent.click(screen.getByText(/Frau/).closest("button")!);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("señora");
    expect(dialog).toHaveTextContent("Das ist Wort1.");
    expect(screen.getByRole("link", { name: /página 3/ })).toHaveAttribute(
      "href",
      "/libros/b1?pagina=3",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Marcar como conocida" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Volver a «vista»" }),
      ).toBeInTheDocument(),
    );
    expect(calls).toEqual([{ op: "update", patch: { status: "known" } }]);
  });

  it("eliminar pide confirmación y quita la palabra", async () => {
    setup([
      word(1, { lemma: "Frau" }),
      word(2, { lemma: "Haus", genders: ["n"] }),
    ]);
    fireEvent.click(screen.getByText(/Frau/).closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(calls).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(calls).toEqual([{ op: "delete" }]);
    expect(screen.getByText("1 de 1 palabras")).toBeInTheDocument();
  });

  it("si falla el guardado avisa y no cambia el estado", async () => {
    failNext = true;
    setup([word(1, { lemma: "Frau" })]);
    fireEvent.click(screen.getByText(/Frau/).closest("button")!);
    fireEvent.click(
      screen.getByRole("button", { name: "Marcar como conocida" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cambiar el estado",
    );
    expect(
      screen.getByRole("button", { name: "Marcar como conocida" }),
    ).toBeInTheDocument();
  });

  it("sin palabras invita a leer un libro", () => {
    setup([]);
    expect(screen.getByText("Aún no tienes palabras.")).toBeInTheDocument();
  });

  it("RF-32: «Exportar CSV» descarga solo las palabras filtradas", async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
      blob = b as Blob;
      return "blob:x";
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    setup([word(1), word(2, { lemma: "Haus" })], "q=Haus");
    fireEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    const text = await blob!.text();
    expect(click).toHaveBeenCalled();
    expect(text).toContain("Haus");
    expect(text).not.toContain("Wort1");
    click.mockRestore();
  });
});
