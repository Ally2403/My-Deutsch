import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFS,
  FONT_SIZES,
  mergePrefs,
  parsePrefs,
  toLocalEntries,
} from "./prefs";

describe("prefs (RF-37)", () => {
  it("un JSON vacío o inválido da los valores por defecto", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("x")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs({})).toEqual(DEFAULT_PREFS);
  });
  it("conserva los valores válidos y descarta los inválidos", () => {
    expect(
      parsePrefs({ theme: "dark", fontSize: "xl", highlight: true, seenMarks: false, extra: 1 }),
    ).toEqual({ theme: "dark", fontSize: "xl", highlight: true, seenMarks: false });
    expect(parsePrefs({ theme: "rojo", fontSize: "enorme", highlight: "si" })).toEqual(DEFAULT_PREFS);
  });
  it("mergePrefs cambia solo lo indicado", () => {
    expect(mergePrefs({ theme: "dark", fontSize: "lg" }, { highlight: true })).toMatchObject({
      theme: "dark",
      fontSize: "lg",
      highlight: true,
    });
  });
  it("toLocalEntries traduce a las claves de localStorage del lector y del tema", () => {
    const e = toLocalEntries({ theme: "dark", fontSize: "lg", highlight: true, seenMarks: false });
    expect(e["my-deutsch:theme"]).toBe("dark");
    expect(e["my-deutsch:highlight"]).toBe("1");
    expect(e["my-deutsch:hide-seen"]).toBe("1");
    expect(e["my-deutsch:font-size"]).toBe("lg");
  });
  it("«Sistema» borra la clave del tema local", () => {
    expect(toLocalEntries({ ...DEFAULT_PREFS, theme: "system" })["my-deutsch:theme"]).toBeNull();
  });
  it("hay cuatro tamaños de letra", () => {
    expect(FONT_SIZES).toEqual(["sm", "md", "lg", "xl"]);
  });
});
