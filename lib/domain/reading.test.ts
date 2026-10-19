import { describe, expect, it } from "vitest";
import type { PageData, Token } from "./page";
import { cropStyle, readingBlocks } from "./reading";

const tok = (t: string, y: number): Token => ({ t, b: [0.1, y, 0.1, 0.02] });
const page = (over: Partial<PageData>): PageData => ({
  v: 1,
  size: [1600, 2000],
  lines: [],
  paragraphs: [],
  images: [],
  fields: [],
  tokens: [],
  lex: {},
  ...over,
});

describe("readingBlocks (RF-18 c1, c2)", () => {
  it("ordena párrafos e ilustraciones por su posición vertical en la página", () => {
    const p = page({
      tokens: [tok("a", 0.1), tok("b", 0.12), tok("c", 0.6)],
      paragraphs: [
        [0, 1],
        [2, 2],
      ],
      images: [[0.1, 0.3, 0.8, 0.2]],
    });
    expect(readingBlocks(p).map((b) => b.kind)).toEqual(["text", "image", "text"]);
    expect(readingBlocks(p)[0]).toEqual({ kind: "text", tokens: [0, 1] });
  });
  it("sin párrafos detectados, todo el texto va en un solo bloque", () => {
    const p = page({ tokens: [tok("a", 0.1), tok("b", 0.2)] });
    expect(readingBlocks(p)).toEqual([{ kind: "text", tokens: [0, 1] }]);
  });
  it("las palabras fuera de todo párrafo no se pierden", () => {
    const p = page({
      tokens: [tok("a", 0.1), tok("b", 0.2), tok("c", 0.3)],
      paragraphs: [[0, 0]],
    });
    const idx = readingBlocks(p).flatMap((b) => (b.kind === "text" ? b.tokens : []));
    expect(idx.sort()).toEqual([0, 1, 2]);
  });
  it("una página vacía no genera bloques", () => {
    expect(readingBlocks(page({}))).toEqual([]);
  });
});

describe("cropStyle", () => {
  it("recorta la caja de la imagen con la proporción correcta", () => {
    const s = cropStyle([0.1, 0.2, 0.5, 0.25], [1600, 2000]);
    expect(s.aspectRatio).toBe("800 / 500");
    expect(s.backgroundSize).toBe("200% auto");
    expect(s.backgroundPosition).toBe("20% 26.667%");
  });
  it("si la caja ocupa todo el ancho, la posición horizontal es 0", () => {
    expect(cropStyle([0, 0.5, 1, 0.5], [1000, 1000]).backgroundPosition).toBe("0% 100%");
  });
});
