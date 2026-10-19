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

  it("RF-45: un verbo separable se muestra con punto medio y se anuncia como tal", () => {
    open(6);
    const dialog = screen.getByRole("dialog");
    expect(screen.getByText("an·rufen")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("anrufen, verbo separable");
  });

  it("RF-45: un verbo no separable no lleva punto medio", () => {
    open(1);
    expect(screen.getByRole("dialog").querySelector("p.text-xl")).toHaveTextContent(/^gehen$/);
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
    const link = screen.getByRole("link", { name: /Wiktionary/ });
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

describe("WordPanel: plural y sin significados (RF-41, RF-21)", () => {
  it("muestra la etiqueta «plural» solo para sustantivos en plural", () => {
    const { container, unmount } = open(0);
    expect(container.ownerDocument.querySelector(".plural-badge")).toHaveTextContent("plural");
    unmount();
    open(8);
    expect(document.querySelector(".plural-badge")).toBeNull();
  });

  it("avisa cuando la entrada no tiene significados", () => {
    const empty = {
      ...page,
      lex: { ...page.lex, "431": { ...page.lex["431"], senses: [] } },
    };
    render(<WordPanel page={empty} tokenIndex={8} pageNumber={1} onClose={() => {}} anchor={null} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Todavía no hay significados");
  });
});

describe("WordPanel: diccionario personal (RF-28, RF-29)", () => {
  const seenWord = { status: "seen" as const, lookups: 3, bookId: "b", page: 12 };

  it("indica cuántas veces la viste y dónde, desde la segunda consulta", () => {
    render(
      <WordPanel
        page={page}
        tokenIndex={8}
        pageNumber={1}
        anchor={null}
        onClose={() => {}}
        seen={seenWord}
        firstBookTitle="Der Schatz"
      />,
    );
    expect(
      screen.getByText("La viste 3 veces · primera vez en Der Schatz, pág. 12"),
    ).toBeInTheDocument();
  });

  it("marca como conocida y pide confirmación antes de eliminar", () => {
    const onStatus = vi.fn();
    const onRemove = vi.fn();
    render(
      <WordPanel
        page={page}
        tokenIndex={8}
        pageNumber={1}
        anchor={null}
        onClose={() => {}}
        seen={seenWord}
        onStatus={onStatus}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Marcar como conocida" }));
    expect(onStatus).toHaveBeenCalledWith(431, "known");
    fireEvent.click(screen.getByRole("button", { name: "Eliminar de mi diccionario" }));
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    expect(onRemove).toHaveBeenCalledWith(431);
  });

  it("una palabra conocida ofrece volver a «vista»; sin diccionario no hay acciones", () => {
    const { rerender } = render(
      <WordPanel
        page={page}
        tokenIndex={8}
        pageNumber={1}
        anchor={null}
        onClose={() => {}}
        seen={{ ...seenWord, status: "known" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Volver a «vista»" })).toBeInTheDocument();
    rerender(
      <WordPanel page={page} tokenIndex={8} pageNumber={1} anchor={null} onClose={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: /conocida|eliminar/i })).toBeNull();
  });
});

describe("WordPanel: palabra no encontrada (RF-25)", () => {
  const open = (searchLexicon?: (w: string) => Promise<import("@/lib/domain/page").LexEntry | null>) =>
    render(
      <WordPanel
        page={page}
        tokenIndex={5}
        pageNumber={1}
        anchor={null}
        onClose={() => {}}
        searchLexicon={searchLexicon}
      />,
    );

  it("dice «no encontramos», muestra la forma y enlaza a Wiktionary y DWDS en pestaña nueva", () => {
    open();
    expect(screen.getByText("No encontramos esta palabra en el diccionario.")).toBeInTheDocument();
    expect(screen.getByText("unbekannt", { selector: "p" })).toBeInTheDocument();
    const wik = screen.getByRole("link", { name: /Wiktionary/ });
    const dwds = screen.getByRole("link", { name: /DWDS/ });
    expect(wik).toHaveAttribute("href", "https://de.wiktionary.org/wiki/unbekannt");
    expect(dwds).toHaveAttribute("href", "https://www.dwds.de/wb/unbekannt");
    for (const a of [wik, dwds]) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
    expect(screen.queryByRole("button", { name: "Buscar de nuevo" })).toBeNull();
  });

  it("permite corregir la forma, buscar de nuevo y mostrar la entrada hallada", async () => {
    const search = vi.fn().mockResolvedValue({
      lemma: "Katze",
      pos: "noun",
      g: ["f"],
      senses: [{ es: "gato", m: false }],
    });
    open(search);
    fireEvent.change(screen.getByLabelText("Corregir la forma de la palabra"), {
      target: { value: "Katze" },
    });
    expect(screen.getByRole("link", { name: /«Katze» en DWDS/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Buscar de nuevo" }));
    expect(await screen.findByText("gato")).toBeInTheDocument();
    expect(search).toHaveBeenCalledWith("Katze");
  });

  it("avisa si tampoco existe y si falla la búsqueda", async () => {
    const search = vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("red"));
    open(search);
    fireEvent.click(screen.getByRole("button", { name: "Buscar de nuevo" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Tampoco encontramos «unbekannt»");
    fireEvent.click(screen.getByRole("button", { name: "Buscar de nuevo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo buscar");
  });
});
