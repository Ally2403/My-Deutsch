import { describe, expect, it } from "vitest";
import { backHref, chooseView, isAdminInAny } from "./book-reader";

describe("chooseView (RF-14)", () => {
  it("sin páginas no monta el lector", () => {
    expect(chooseView(0)).toBe("empty");
  });
  it("con páginas muestra el lector", () => {
    expect(chooseView(1)).toBe("reader");
    expect(chooseView(250)).toBe("reader");
  });
});

describe("backHref", () => {
  it("usa el primer grupo del libro del que la persona es miembro", () => {
    expect(backHref(["g1", "g2", "g3"], [{ group_id: "g3", role: "member" }, { group_id: "g2", role: "admin" }])).toBe("/grupos/g2");
  });
  it("sin grupo en común vuelve a /grupos", () => {
    expect(backHref(["g1"], [])).toBe("/grupos");
    expect(backHref([], [{ group_id: "g9", role: "member" }])).toBe("/grupos");
  });
});

describe("isAdminInAny", () => {
  it("es admin si lo es en algún grupo que tiene el libro", () => {
    expect(isAdminInAny(["g1", "g2"], [{ group_id: "g2", role: "admin" }])).toBe(true);
  });
  it("no cuenta admin de grupos que no tienen el libro ni rol miembro", () => {
    expect(isAdminInAny(["g1"], [{ group_id: "g9", role: "admin" }, { group_id: "g1", role: "member" }])).toBe(false);
  });
});
