import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PageData } from "@/lib/domain/page";
import { TextLayer } from "./text-layer";

const page: PageData = {
  v: 1,
  size: [1600, 2263],
  lines: [
    [0, 1],
    [2, 2],
  ],
  paragraphs: [[0, 2]],
  images: [],
  fields: [],
  tokens: [
    { t: "Häuser", b: [0.112, 0.081, 0.064, 0.018], l: 431 },
    { t: "sind", b: [0.2, 0.081, 0.04, 0.018] },
    {
      t: "Normalerweise",
      b: [0.8, 0.3, 0.12, 0.018],
      b2: [0.1, 0.32, 0.03, 0.018],
    },
  ],
  lex: {
    "431": {
      lemma: "Haus",
      pos: "noun",
      g: ["n"],
      senses: [{ es: "casa", m: false }],
    },
  },
};

describe("TextLayer (RF-17)", () => {
  it("coloca cada palabra con porcentajes relativos a la página", () => {
    render(<TextLayer page={page} onWordClick={() => {}} />);
    const word = screen.getByRole("button", { name: "Häuser" });
    expect(word.style.left).toBe("11.2%");
    expect(word.style.top).toBe("8.1%");
    expect(word.style.width).toBe("6.4%");
    expect(word.style.height).toBe("1.8%");
  });

  it("una palabra cortada con guion produce dos cajas con el mismo token", () => {
    const { container } = render(
      <TextLayer page={page} onWordClick={() => {}} />,
    );
    const parts = container.querySelectorAll('[data-token="2"]');
    expect(parts).toHaveLength(2);
    expect((parts[1] as HTMLElement).style.left).toBe("10%");
  });

  it("clic y Enter llaman a onWordClick con el índice", () => {
    const onWordClick = vi.fn();
    render(<TextLayer page={page} onWordClick={onWordClick} />);
    const word = screen.getByRole("button", { name: "sind" });
    fireEvent.click(word);
    expect(onWordClick).toHaveBeenLastCalledWith(1, expect.anything());
    fireEvent.keyDown(word, { key: "Enter" });
    expect(onWordClick).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(word, { key: " " });
    expect(onWordClick).toHaveBeenCalledTimes(3);
  });

  it("sin tokens no renderiza botones", () => {
    render(
      <TextLayer
        page={{ ...page, tokens: [], lines: [], paragraphs: [] }}
        onWordClick={() => {}}
      />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("separa las líneas con un salto para que la copia conserve el orden", () => {
    const { container } = render(
      <TextLayer page={page} onWordClick={() => {}} />,
    );
    expect(container.querySelectorAll("br")).toHaveLength(2);
  });
});

describe("TextLayer: palabras activas (RN-07)", () => {
  it("marca las palabras indicadas en active", () => {
    render(<TextLayer page={page} onWordClick={() => {}} active={new Set([1])} />);
    expect(screen.getByRole("button", { name: "sind" })).toHaveClass("reader-word-active");
    expect(screen.getByRole("button", { name: "Häuser" })).not.toHaveClass("reader-word-active");
  });
});
