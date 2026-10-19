import { describe, expect, it } from "vitest";
import { splitSeparable } from "./separable";

describe("splitSeparable (RF-45)", () => {
  it.each([
    ["vorgehen", ["vor", "gehen"]],
    ["aufstehen", ["auf", "stehen"]],
    ["herauskommen", ["heraus", "kommen"]], // la partícula más larga gana
    ["zurückkehren", ["zurück", "kehren"]],
    ["mitteilen", ["mit", "teilen"]],
    ["antun", ["an", "tun"]],
    ["zusammenarbeiten", ["zusammen", "arbeiten"]],
  ])("%s → partícula + raíz", (lemma, parts) => {
    expect(splitSeparable(lemma, "verb")).toEqual(parts);
  });

  it.each(["beginnen", "verstehen", "gehen", "bekommen", "entscheiden"])(
    "%s no es separable",
    (lemma) => {
      expect(splitSeparable(lemma, "verb")).toBeNull();
    },
  );

  it("no parte las partículas ambiguas", () => {
    for (const l of [
      "durchqueren",
      "übersetzen",
      "umarmen",
      "unterhalten",
      "wiederholen",
    ])
      expect(splitSeparable(l, "verb")).toBeNull();
  });

  it("solo los verbos, y no los terminados en -ieren ni los casos conocidos", () => {
    expect(splitSeparable("Aufgabe", "noun")).toBeNull();
    expect(splitSeparable("aufgeben", "noun")).toBeNull();
    expect(splitSeparable("abonnieren", "verb")).toBeNull();
    expect(splitSeparable("ankern", "verb")).toBeNull();
    expect(splitSeparable("zucken", "verb")).toBeNull();
    for (const l of [
      "hinterlassen",
      "hindern",
      "herrschen",
      "einigen",
      "beißen",
    ])
      expect(splitSeparable(l, "verb")).toBeNull();
  });

  it("exige una raíz razonable detrás de la partícula", () => {
    expect(splitSeparable("anken", "verb")).toBeNull();
    expect(splitSeparable("auf", "verb")).toBeNull();
  });

  it("ignora mayúsculas del lema al comparar pero conserva su escritura", () => {
    expect(splitSeparable("Vorgehen", "verb")).toEqual(["Vor", "gehen"]);
  });
});
