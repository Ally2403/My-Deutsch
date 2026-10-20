import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PageData } from "@/lib/domain/page";
import { PhrasePanel } from "./phrase-panel";

const b = [0.1, 0.1, 0.05, 0.02] as const;

function makePage(withSents: boolean): PageData {
  return {
    v: 1,
    size: [1600, 2263],
    lines: [[0, 7]],
    paragraphs: [[0, 7]],
    images: [],
    fields: [],
    tokens: [
      { t: "Der", b },
      { t: "Tisch", b, l: 1 },
      { t: "steht", b, l: 2 },
      { t: "hier.", b },
      { t: "Die", b },
      { t: "Lampe", b, l: 3 },
      { t: "ist", b },
      { t: "neu.", b },
    ],
    lex: {
      "1": {
        lemma: "Tisch",
        pos: "noun",
        g: ["m"],
        senses: [{ es: "mesa", m: false }],
      },
      "2": {
        lemma: "stehen",
        pos: "verb",
        senses: [{ es: "estar de pie", m: false }],
      },
      "3": {
        lemma: "Lampe",
        pos: "noun",
        g: ["f"],
        senses: [{ es: "lámpara", m: false }],
      },
    },
    ...(withSents
      ? {
          sents: [
            { r: [0, 3] as const, es: "La mesa está aquí." },
            { r: [4, 7] as const, es: "La lámpara es nueva." },
          ],
        }
      : {}),
  };
}

afterEach(() => vi.restoreAllMocks());

describe("PhrasePanel (RF-47)", () => {
  it("muestra la traducción de las dos oraciones que cubre la selección", () => {
    render(
      <PhrasePanel page={makePage(true)} range={[2, 5]} onClose={() => {}} />,
    );
    const dialog = screen.getByRole("dialog", {
      name: /traducción de la frase/i,
    });
    expect(dialog).toBeTruthy();
    expect(screen.getByText("La mesa está aquí.")).toBeTruthy();
    expect(screen.getByText("La lámpara es nueva.")).toBeTruthy();
    expect(
      screen.getByText(/puede fallar en frases idiomáticas/i),
    ).toBeTruthy();
  });

  it("lista las glosas con artículo en color y escrito (RNF-09)", () => {
    const { container } = render(
      <PhrasePanel page={makePage(true)} range={[1, 5]} onClose={() => {}} />,
    );
    expect(
      container.ownerDocument.querySelector(".gender-m")?.textContent,
    ).toBe("der");
    expect(
      container.ownerDocument.querySelector(".gender-f")?.textContent,
    ).toBe("die");
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toContain("mesa");
    expect(items[1]).toContain("estar de pie");
  });

  it("un libro sin sents muestra solo las glosas y el aviso", () => {
    render(
      <PhrasePanel page={makePage(false)} range={[1, 2]} onClose={() => {}} />,
    );
    expect(
      screen.getByText(
        "Sube de nuevo el libro para traducir oraciones completas.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/traducción automática/i)).toBeNull();
    expect(screen.getAllByRole("listitem")[0].textContent).toContain("mesa");
  });

  it("Esc y el botón Cerrar llaman a onClose", () => {
    const onClose = vi.fn();
    render(
      <PhrasePanel page={makePage(true)} range={[1, 2]} onClose={onClose} />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("Copiar escribe el texto y la traducción en el portapapeles", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(
      <PhrasePanel page={makePage(true)} range={[1, 2]} onClose={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copiar" }));
    await waitFor(() => expect(screen.getByText("Copiado")).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith("Tisch steht\n\nLa mesa está aquí.");
  });
});
