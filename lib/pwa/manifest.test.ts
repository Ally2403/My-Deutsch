import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../../app/manifest";

// RF-50 criterio 1.
describe("manifest", () => {
  const m = manifest();
  it("es instalable y arranca en /grupos", () => {
    expect(m.name).toBe("My-Deutsch");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/grupos");
    expect(m.scope).toBe("/");
    expect(m.lang).toBe("es");
  });
  it("declara íconos 192, 512 y maskable que existen con ese tamaño", () => {
    const icons = m.icons ?? [];
    const sizes = icons.map((i) => `${i.sizes}:${i.purpose ?? "any"}`);
    expect(sizes).toEqual(
      expect.arrayContaining([
        "192x192:any",
        "512x512:any",
        "512x512:maskable",
      ]),
    );
    for (const i of icons) {
      const file = join(process.cwd(), "public", i.src);
      expect(existsSync(file)).toBe(true);
      const buf = readFileSync(file);
      const [w, h] = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
      expect(`${w}x${h}`).toBe(i.sizes);
    }
  });
  it("existe el apple-touch-icon de 180", () => {
    const buf = readFileSync(
      join(process.cwd(), "public/icons/apple-touch-180.png"),
    );
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([180, 180]);
  });
});
