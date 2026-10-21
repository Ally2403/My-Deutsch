// RF-50: genera los íconos de la PWA desde un SVG (formas, sin fuentes). Uso: node scripts/make-icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const ACCENT = "#4f46e5";
// Libro abierto en blanco; `pad` deja margen para la zona segura del ícono maskable (80 %).
const svg = (
  pad,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="${ACCENT}"/>
<g transform="translate(256 256) scale(${pad}) translate(-256 -256)">
<path d="M256 150c-34-22-80-28-124-18v212c44-10 90-4 124 18z" fill="#fff"/>
<path d="M256 150c34-22 80-28 124-18v212c-44-10-90-4-124 18z" fill="#fff" fill-opacity=".82"/>
</g></svg>`;

const out = "public/icons";
await mkdir(out, { recursive: true });
const jobs = [
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  ["maskable-512.png", 512, 0.72],
  ["apple-touch-180.png", 180, 1],
];
for (const [name, size, pad] of jobs) {
  const png = await sharp(Buffer.from(svg(pad)))
    .resize(size, size)
    .png()
    .toBuffer();
  await writeFile(`${out}/${name}`, png);
}
console.log("Íconos generados en", out);
