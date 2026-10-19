import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageData } from "@/lib/domain/page";
import { PageReader } from "./page-reader";

const make = (n: number): PageData => ({
  v: 1,
  size: [1600, 2263],
  lines: [[0, 0]],
  paragraphs: [[0, 0]],
  images: [],
  fields: [],
  tokens: [{ t: `Wort${n}`, b: [0.1, 0.1, 0.1, 0.02] }],
  lex: {},
});

let loadPage: ReturnType<typeof vi.fn<(n: number) => Promise<PageData>>>;

function setup(total = 3) {
  return render(
    <PageReader
      total={total}
      loadPage={loadPage}
      imageUrl={(n) => `/p/${n}.webp`}
    />,
  );
}

beforeEach(() => {
  loadPage = vi.fn((n: number) => Promise.resolve(make(n)));
});

describe("PageReader (RF-16)", () => {
  it("muestra «página 1 de 3» y el texto de la primera página", async () => {
    setup();
    expect(screen.getByText("página 1 de 3")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Wort1" }),
    ).toBeInTheDocument();
  });

  it("ArrowRight pasa a la página 2 y ArrowLeft vuelve", async () => {
    setup();
    await screen.findByRole("button", { name: "Wort1" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(
      await screen.findByRole("button", { name: "Wort2" }),
    ).toBeInTheDocument();
    expect(screen.getByText("página 2 de 3")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "PageUp" });
    expect(
      await screen.findByRole("button", { name: "Wort1" }),
    ).toBeInTheDocument();
  });

  it("no sale del rango en la primera ni en la última página", async () => {
    setup(2);
    await screen.findByRole("button", { name: "Wort1" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("página 1 de 2")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("página 2 de 2")).toBeInTheDocument();
  });

  it("el selector salta a una página y rechaza valores fuera de rango", async () => {
    setup();
    await screen.findByRole("button", { name: "Wort1" });
    const input = screen.getByLabelText("Ir a la página");
    fireEvent.change(input, { target: { value: "9" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("1 y 3");
    expect(screen.getByText("página 1 de 3")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.submit(input.closest("form")!);
    expect(
      await screen.findByRole("button", { name: "Wort3" }),
    ).toBeInTheDocument();
  });

  it("precarga la página siguiente al montar y las vecinas al cambiar", async () => {
    setup();
    await screen.findByRole("button", { name: "Wort1" });
    expect(loadPage).toHaveBeenCalledWith(2);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await screen.findByRole("button", { name: "Wort2" });
    await waitFor(() => expect(loadPage).toHaveBeenCalledWith(3));
    expect(loadPage.mock.calls.filter(([n]) => n === 1)).toHaveLength(1);
  });

  it("una página sin tokens se muestra sin botones", async () => {
    loadPage = vi.fn(() =>
      Promise.resolve({ ...make(1), tokens: [], lines: [], paragraphs: [] }),
    );
    setup(1);
    await screen.findByRole("img", { name: /página 1/i });
    expect(screen.queryAllByRole("button", { name: /Wort/ })).toHaveLength(0);
  });

  it("muestra un error con reintento si la página no carga", async () => {
    loadPage.mockRejectedValueOnce(new Error(""));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cargar",
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Reintentar" })),
    );
    expect(
      await screen.findByRole("button", { name: "Wort1" }),
    ).toBeInTheDocument();
  });
});

describe("PageReader con panel de palabra (RF-21 c4)", () => {
  it("tocar una palabra abre el panel y Escape lo cierra sin cambiar de página", async () => {
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Wort1" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("página 1 de 3")).toBeInTheDocument();
  });

  it("al cambiar de página se cierra el panel", async () => {
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Wort1" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await screen.findByRole("button", { name: "Wort2" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("PageReader: interruptor de sustantivos (RF-26)", () => {
  it("colorea los sustantivos al activarlo y lo desactiva al volver a pulsar", async () => {
    localStorage.clear();
    loadPage = vi.fn((n: number) =>
      Promise.resolve({
        ...make(n),
        tokens: [{ t: `Haus${n}`, b: [0.1, 0.1, 0.1, 0.02] as const, l: 1 }],
        lex: { "1": { lemma: "Haus", pos: "noun", g: ["n" as const], senses: [] } },
      }),
    );
    setup();
    const word = await screen.findByRole("button", { name: "Haus1" });
    const toggle = screen.getByRole("button", { name: "Colorear sustantivos" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(word).not.toHaveClass("hl-n");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(word).toHaveClass("hl-n");
    fireEvent.click(toggle);
    expect(word).not.toHaveClass("hl-n");
    localStorage.clear();
  });
});

describe("PageReader: zonas de toque lateral", () => {
  it("quedan debajo de la capa de texto para no tapar palabras de los márgenes", async () => {
    const { container } = setup();
    await screen.findByRole("button", { name: "Wort1" });
    const layer = container.querySelector(".reader-text-layer")!;
    const zones = container.querySelectorAll<HTMLElement>('button[aria-hidden="true"]');
    expect(zones).toHaveLength(2);
    for (const zone of zones) {
      // Un hermano que aparece antes en el DOM se dibuja debajo.
      expect(zone.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});

describe("PageReader: interruptor de plurales (RF-41)", () => {
  it("marca los plurales sin depender del interruptor de género y lo recuerda", async () => {
    localStorage.clear();
    loadPage = vi.fn((n: number) =>
      Promise.resolve({
        ...make(n),
        tokens: [{ t: `Haeuser${n}`, b: [0.1, 0.1, 0.1, 0.02] as const, l: 1, f: "pl" }],
        lex: { "1": { lemma: "Haus", pos: "noun", g: ["n" as const], senses: [] } },
      }),
    );
    setup();
    const word = await screen.findByRole("button", { name: "Haeuser1" });
    const toggle = screen.getByRole("button", { name: "Marcar plurales" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(word).not.toHaveClass("pl-mark");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(word).toHaveClass("pl-mark");
    expect(word).not.toHaveClass("hl-n");
    expect(localStorage.getItem("my-deutsch:plurals")).toBe("1");
    fireEvent.click(toggle);
    expect(word).not.toHaveClass("pl-mark");
    localStorage.clear();
  });
});

describe("PageReader: errores y altura", () => {
  it("muestra el mensaje del Error de loadPage y mantiene «Reintentar»", async () => {
    loadPage.mockRejectedValue(new Error("Esta página aún se está procesando"));
    const { container } = setup();
    expect(
      await screen.findByText(/Esta página aún se está procesando/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("con un rechazo sin mensaje conserva el texto actual", async () => {
    loadPage.mockRejectedValue("boom");
    setup();
    expect(
      await screen.findByText(/No se pudo cargar la página\./),
    ).toBeInTheDocument();
  });

  it("heightClassName reemplaza h-dvh; sin prop se conserva", () => {
    const a = render(
      <PageReader total={1} loadPage={loadPage} imageUrl={(n) => `/p/${n}.webp`} heightClassName="h-full" />,
    );
    expect(a.container.firstElementChild).toHaveClass("h-full");
    expect(a.container.firstElementChild).not.toHaveClass("h-dvh");
    a.unmount();
    const b = setup(1);
    expect(b.container.firstElementChild).toHaveClass("h-dvh");
  });
});

describe("PageReader: error obsoleto al volver", () => {
  it("si la página 3 falló y al volver carga bien, no queda el alert", async () => {
    let fail3 = true;
    loadPage.mockImplementation((n: number) =>
      n === 3 && fail3
        ? Promise.reject(new Error("Esta página aún se está procesando"))
        : Promise.resolve(make(n)),
    );
    setup(5);
    await screen.findByRole("button", { name: "Wort1" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await screen.findByRole("button", { name: "Wort2" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/aún se está procesando/);
    fail3 = false;
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await screen.findByRole("button", { name: "Wort4" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(await screen.findByRole("button", { name: "Wort3" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("PageReader: retomar la lectura (RF-20)", () => {
  it("abre en la página inicial indicada y avisa de cada cambio", async () => {
    const onPageChange = vi.fn();
    render(
      <PageReader
        total={5}
        loadPage={loadPage}
        imageUrl={(n) => `/p/${n}.webp`}
        initialPage={4}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText("página 4 de 5")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Wort4" })).toBeInTheDocument();
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await screen.findByRole("button", { name: "Wort5" });
    expect(onPageChange).toHaveBeenLastCalledWith(5);
  });

  it("una página inicial fuera de rango se ajusta al libro", () => {
    render(
      <PageReader
        total={3}
        loadPage={loadPage}
        imageUrl={(n) => `/p/${n}.webp`}
        initialPage={99}
      />,
    );
    expect(screen.getByText("página 3 de 3")).toBeInTheDocument();
  });
});

describe("PageReader: palabras ya vistas (RF-28)", () => {
  it("marca las vistas y el interruptor las oculta", async () => {
    loadPage = vi.fn((n: number) =>
      Promise.resolve({ ...make(n), tokens: [{ ...make(n).tokens[0], l: 5 }] }),
    );
    localStorage.removeItem("my-deutsch:hide-seen");
    render(
      <PageReader
        total={2}
        loadPage={loadPage}
        imageUrl={(n) => `/p/${n}.webp`}
        seenWords={new Map([[5, { status: "seen", lookups: 1, bookId: null, page: null }]])}
      />,
    );
    const word = await screen.findByRole("button", { name: "Wort1" });
    expect(word).toHaveClass("seen-seen");
    fireEvent.click(screen.getByRole("button", { name: "Marcar palabras vistas" }));
    expect(screen.getByRole("button", { name: "Wort1" })).not.toHaveClass("seen-seen");
    localStorage.removeItem("my-deutsch:hide-seen");
  });
});
