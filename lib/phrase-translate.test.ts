// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearFragmentCache,
  MAX_FRAGMENT_CHARS,
  translateFragment,
} from "./phrase-translate";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const ok = (t: string) =>
  json({ responseStatus: 200, responseData: { translatedText: t } });

beforeEach(() => clearFragmentCache());

describe("translateFragment (RF-47)", () => {
  it("pide solo el trozo, de alemán a español, y decodifica entidades", async () => {
    const f = vi.fn().mockResolvedValue(ok("La mesa &amp; l&#39;a"));
    const r = await translateFragment("Der  Tisch", { fetchImpl: f });
    expect(r).toEqual({ ok: true, es: "La mesa & l'a" });
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain("q=Der%20Tisch");
    expect(url).toContain("langpair=de%7Ces");
  });

  it("repite la misma consulta desde la memoria, sin red", async () => {
    const f = vi.fn().mockResolvedValue(ok("hola"));
    await translateFragment("Hallo Welt", { fetchImpl: f });
    await translateFragment("Hallo Welt", { fetchImpl: f });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("no consulta un trozo vacío ni uno demasiado largo", async () => {
    const f = vi.fn();
    expect(await translateFragment("  ", { fetchImpl: f })).toEqual({
      ok: false,
      reason: "empty",
    });
    expect(
      await translateFragment("a ".repeat(MAX_FRAGMENT_CHARS), {
        fetchImpl: f,
      }),
    ).toEqual({ ok: false, reason: "too_long" });
    expect(f).not.toHaveBeenCalled();
  });

  it("el aviso de límite diario no se muestra como traducción", async () => {
    const f = vi
      .fn()
      .mockResolvedValue(
        ok(
          "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY",
        ),
      );
    expect(await translateFragment("Guten Tag", { fetchImpl: f })).toEqual({
      ok: false,
      reason: "quota",
    });
  });

  it.each([
    ["HTTP 429", () => json({}, 429), "quota"],
    ["HTTP 500", () => json({}, 500), "network"],
    ["cuerpo sin traducción", () => json({ responseStatus: 200 }), "network"],
  ])("%s → error sin lanzar", async (_n, make, reason) => {
    const f = vi.fn().mockResolvedValue(make());
    expect(await translateFragment("Guten Tag", { fetchImpl: f })).toEqual({
      ok: false,
      reason,
    });
  });

  it("sin conexión devuelve network", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("fail"));
    expect(await translateFragment("Guten Tag", { fetchImpl: f })).toEqual({
      ok: false,
      reason: "network",
    });
  });
});
