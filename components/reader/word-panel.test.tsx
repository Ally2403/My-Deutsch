import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setLookupHandler } from "@/lib/domain/lookup-log";
import type { PageData } from "@/lib/domain/page";
import { WordPanel } from "./word-panel";

const b = [0.1, 0.1, 0.05, 0.02] as const;

const page: PageData = {
  v: 1,
  size: [1600, 2263],
  lines: [[0, 8]],
  paragraphs: [[0, 8]],
  images: [],
  fields: [],
  tokens: [
    { t: "Häuser", b, l: 431, f: "pl" },
    { t: "ging", b, l: 107, f: "pret" },
    { t: "Teil", b, l: 108 },
    { t: "Leute", b, l: 109 },
    { t: "Berlin.", b, l: 103 },
    { t: "unbekannt", b },
    { t: "ruft", b, l: 112, sep: 7 },
    { t: "an.", b, l: 112, sep: 6 },
    { t: "Haus", b, l: 431 },
  ],
  lex: {
    "431": {
      lemma: "Haus",
      pos: "noun",
      g: ["n"],
      pl: "Häuser",
      senses: [{ es: "casa", m: false }],
    },
    "107": { lemma: "gehen", pos: "verb", senses: [{ es: "ir", m: false }] },
    "108": {
      lemma: "Teil",
      pos: "noun",
      g: ["m", "n"],
      pl: "Teile",
      senses: [
        { es: "parte", m: false },
        { es: "pieza", m: true },
      ],
    },
    "109": {
      lemma: "Leute",
      pos: "noun",
      g: [],
      senses: [{ es: "gente", m: false }],
    },
    "103": {
      lemma: "Berlin",
      pos: "propn",
      senses: [{ es: "Berlín", m: false }],
    },
    "112": {
      lemma: "anrufen",
      pos: "verb",
      senses: [{ es: "llamar", m: false }],
    },
  },
};

function open(tokenIndex: number, onClose = () => {}) {
  return render(
    <WordPanel
      page={page}
      tokenIndex={tokenIndex}
      pageNumber={2}
      onClose={onClose}
      anchor={null}
    />,
  );
}

afterEach(() => {
  setLookupHandler(null);
  vi.unstubAllGlobals();
});

describe("WordPanel (RF-21, RF-22)", () => {
  it("sustantivo: artículo, lema y plural coloreados por género", () => {
    open(0);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("das Haus, die Häuser");
    expect(
      screen.getByText("das", { selector: ".gender-n" }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent("sustantivo");
    expect(dialog).toHaveTextContent("Häuser → Haus, plural");
  });

  it("verbo: muestra la forma consultada y el infinitivo", () => {
    open(1);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("ging → gehen, pretérito");
    expect(dialog).toHaveTextContent("verbo");
    expect(dialog.querySelector('[class*="gender-"]')).toBeNull();
  });

  it("varios géneros: todos los artículos y la etiqueta", () => {
    open(2);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("der/das Teil");
    expect(dialog).toHaveTextContent("varios géneros");
    expect(
      screen.getByText("der", { selector: ".gender-m" }),
    ).toBeInTheDocument();
  });

  it("marca las acepciones de traducción automática", () => {
    open(2);
    expect(screen.getByText("parte")).toBeInTheDocument();
    expect(screen.getAllByText("traducción automática")).toHaveLength(1);
  });

  it("solo plural: sin color y con etiqueta", () => {
    open(3);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("die Leute");
    expect(dialog).toHaveTextContent("solo plural");
    expect(dialog.querySelector(".gender-m, .gender-n, .gender-f")).toBeNull();
  });

  it("nombre propio: sin color de género", () => {
    open(4);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("nombre propio");
    expect(dialog.querySelector('[class*="gender-"]')).toBeNull();
  });

  it("sin entrada: forma tal cual y enlace de búsqueda externa", () => {
    open(5);
    const link = screen.getByRole("link", { name: /unbekannt/ });
    expect(link).toHaveAttribute(
      "href",
      "https://de.wiktionary.org/wiki/unbekannt",
    );
    expect(link).toHaveAttribute("rel", "noopener");
    expect(screen.queryByText("traducción automática")).toBeNull();
  });

  it("limita a 5 acepciones", () => {
    const many = {
      ...page,
      lex: {
        ...page.lex,
        "431": {
          ...page.lex["431"],
          senses: Array.from({ length: 5 }, (_, i) => ({
            es: `s${i}`,
            m: false,
          })),
        },
      },
    };
    render(
      <WordPanel
        page={many}
        tokenIndex={8}
        pageNumber={1}
        onClose={() => {}}
        anchor={null}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("no hace peticiones de red (RNF-01)", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    open(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("registra la consulta con la oración y el id de léxico (RN-05)", () => {
    const handler = vi.fn();
    setLookupHandler(handler);
    open(0);
    expect(handler).toHaveBeenCalledWith({
      lexiconId: 431,
      lemma: "Haus",
      pos: "noun",
      page: 2,
      sentence: expect.stringContaining("Häuser"),
    });
  });

  it("no registra consultas de palabras sin entrada", () => {
    const handler = vi.fn();
    setLookupHandler(handler);
    open(5);
    expect(handler).not.toHaveBeenCalled();
  });

  it("Escape y el botón Cerrar llaman a onClose", () => {
    const onClose = vi.fn();
    open(0, onClose);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("deslizar hacia abajo ≥ 60 px cierra el panel", () => {
    const onClose = vi.fn();
    open(0, onClose);
    const handle = screen.getByTestId("panel-handle");
    fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 170, pointerId: 1 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("un deslizamiento corto no cierra", () => {
    const onClose = vi.fn();
    open(0, onClose);
    const handle = screen.getByTestId("panel-handle");
    fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 130, pointerId: 1 });
    expect(onClose).not.toHaveBeenCalled();
  });
});
