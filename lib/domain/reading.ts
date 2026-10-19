import type { Box, PageData } from "./page";

/** RF-18: bloques del modo lectura en el orden vertical del original. */
export type ReadingBlock =
  | { kind: "text"; tokens: number[] }
  | { kind: "image"; box: Box };

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export function readingBlocks(page: PageData): ReadingBlock[] {
  const used = new Set<number>();
  const blocks: { y: number; block: ReadingBlock }[] = [];
  for (const [a, b] of page.paragraphs) {
    const tokens = range(a, b).filter((i) => !used.has(i));
    tokens.forEach((i) => used.add(i));
    if (tokens.length)
      blocks.push({ y: page.tokens[tokens[0]].b[1], block: { kind: "text", tokens } });
  }
  // Palabras que ningún párrafo cubre: un bloque propio, para no perder texto.
  const rest = page.tokens.map((_, i) => i).filter((i) => !used.has(i));
  if (rest.length) blocks.push({ y: page.tokens[rest[0]].b[1], block: { kind: "text", tokens: rest } });
  for (const box of page.images) blocks.push({ y: box[1], block: { kind: "image", box } });
  return blocks.sort((a, b) => a.y - b.y).map((b) => b.block);
}

const round = (n: number) => +n.toFixed(3);

/** Estilo CSS que muestra solo el recorte `box` de la imagen de la página. */
export function cropStyle(box: Box, size: readonly [number, number]) {
  const [x, y, w, h] = box;
  return {
    aspectRatio: `${round(w * size[0])} / ${round(h * size[1])}`,
    backgroundSize: `${round(100 / w)}% auto`,
    backgroundPosition: `${w >= 1 ? 0 : round((x / (1 - w)) * 100)}% ${h >= 1 ? 0 : round((y / (1 - h)) * 100)}%`,
  };
}
