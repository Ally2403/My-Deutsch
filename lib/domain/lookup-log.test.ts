import { afterEach, describe, expect, it, vi } from "vitest";
import { recordLookup, setLookupHandler, type Lookup } from "./lookup-log";

const lookup: Lookup = {
  lexiconId: 431,
  lemma: "Haus",
  pos: "noun",
  page: 2,
  sentence: "Die Häuser sind alt.",
};

afterEach(() => setLookupHandler(null));

describe("recordLookup (RN-05)", () => {
  it("sin manejador no lanza ni hace nada", () => {
    expect(() => recordLookup(lookup)).not.toThrow();
  });

  it("con manejador lo llama una vez con la consulta", () => {
    const handler = vi.fn();
    setLookupHandler(handler);
    recordLookup(lookup);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(lookup);
  });

  it("un manejador que lanza no rompe la lectura", () => {
    setLookupHandler(() => {
      throw new Error("sin red");
    });
    expect(() => recordLookup(lookup)).not.toThrow();
  });
});
