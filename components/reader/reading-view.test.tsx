import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PageData } from "@/lib/domain/page";
import { ReadingView } from "./reading-view";

const page: PageData = {
  v: 1,
  size: [1600, 2000],
  lines: [],
  paragraphs: [
    [0, 1],
    [2, 2],
  ],
  images: [[0.1, 0.3, 0.8, 0.2]],
  fields: [],
  tokens: [
    { t: "Der", b: [0.1, 0.1, 0.1, 0.02] },
    { t: "Tisch", b: [0.2, 0.1, 0.1, 0.02], l: 7 },
    { t: "Lampe", b: [0.1, 0.6, 0.1, 0.02] },
  ],
  lex: {},
};

const setup = (over = {}) => {
  const onWordClick = vi.fn();
  render(
    <ReadingView page={page} imageUrl="/p/1.webp" fontSize="lg" onWordClick={onWordClick} {...over} />,
  );
  return onWordClick;
};

describe("ReadingView (RF-18)", () => {
  it("muestra las palabras en orden y la ilustración entre los párrafos", () => {
    setup();
    const words = screen.getAllByRole("button").map((b) => b.textContent?.trim());
    expect(words).toEqual(["Der", "Tisch", "Lampe"]);
    const img = screen.getByRole("img", { name: "Ilustración de la página" });
    const lampe = screen.getByRole("button", { name: "Lampe" });
    expect(img.compareDocumentPosition(lampe) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("tocar una palabra avisa con su número de token", () => {
    const onWordClick = setup();
    fireEvent.click(screen.getByRole("button", { name: "Tisch" }));
    expect(onWordClick).toHaveBeenCalledWith(1, expect.anything());
  });
  it("aplica género, plural y marca de vista como en la vista original", () => {
    setup({
      highlight: new Map([[1, "m"]]),
      plurals: new Set([2]),
      seen: new Map([[1, "seen"]]),
      active: new Set([0]),
    });
    expect(screen.getByRole("button", { name: "Tisch" })).toHaveClass("hl-m", "seen-seen");
    expect(screen.getByRole("button", { name: "Lampe" })).toHaveClass("pl-mark");
    expect(screen.getByRole("button", { name: "Der" })).toHaveClass("reader-word-active");
  });
  it("el tamaño de letra viene de la preferencia", () => {
    setup({ fontSize: "xl" });
    expect(screen.getByTestId("reading-view")).toHaveAttribute("data-size", "xl");
  });
});
