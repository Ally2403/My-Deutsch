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
    loadPage.mockRejectedValueOnce(new Error("red"));
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
