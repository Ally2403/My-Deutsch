import { describe, expect, it } from "vitest";
import type { DictWord } from "./dictionary";
import { BOM, toCsv } from "./dictionary-export";

const w = (over: Partial<DictWord>): DictWord => ({
  lexiconId: 1,
  lemma: "Mädchen",
  pos: "noun",
  genders: ["n"],
  plural: "Mädchen",
  glosses: ["niña", "chica"],
  status: "seen",
  lookups: 3,
  bookId: "b1",
  page: 4,
  sentence: null,
  firstSeenAt: "2026-01-01",
  lastSeenAt: "2026-01-02",
  ...over,
});

describe("toCsv (RF-32)", () => {
  it("empieza con BOM UTF-8 y la cabecera pedida", () => {
    const csv = toCsv([], {});
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(1).trim()).toBe(
      "artículo;lema;tipo;significados;estado;consultas;libro",
    );
  });
  it("conserva tildes y umlauts y escribe el artículo, el tipo y el estado en español", () => {
    const row = toCsv([w({})], { b1: "Der Schatz" }).split("\r\n")[1];
    expect(row).toBe("das;Mädchen;sustantivo;niña, chica;vista;3;Der Schatz");
  });
  it("deja vacío el artículo de lo que no es sustantivo", () => {
    const row = toCsv([w({ lemma: "gehen", pos: "verb", genders: [], status: "known" })], {}).split("\r\n")[1];
    expect(row.startsWith(";gehen;verbo;")).toBe(true);
    expect(row).toContain(";conocida;");
  });
  it("entrecomilla separadores, comillas y saltos de línea", () => {
    const row = toCsv([w({ glosses: ['a;b', 'dice "hola"'] })], {}).split("\r\n")[1];
    expect(row).toContain('"a;b, dice ""hola"""');
  });
  it("neutraliza fórmulas de Excel al inicio de una celda", () => {
    const row = toCsv([w({ glosses: ["=1+1"] })], {}).split("\r\n")[1];
    expect(row).toContain("'=1+1");
  });
});
