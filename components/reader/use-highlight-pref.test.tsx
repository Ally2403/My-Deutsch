import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHighlightPref } from "./use-highlight-pref";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("useHighlightPref (RF-26 c3)", () => {
  it("empieza desactivado", () => {
    const { result } = renderHook(() => useHighlightPref());
    expect(result.current[0]).toBe(false);
  });

  it("recuerda la preferencia entre montajes (localStorage)", () => {
    const first = renderHook(() => useHighlightPref());
    act(() => first.result.current[1](true));
    expect(first.result.current[0]).toBe(true);
    expect(localStorage.getItem("my-deutsch:highlight")).toBe("1");
    first.unmount();
    const second = renderHook(() => useHighlightPref());
    expect(second.result.current[0]).toBe(true);
    act(() => second.result.current[1](false));
    expect(localStorage.getItem("my-deutsch:highlight")).toBe("0");
  });

  it("dos componentes montados se mantienen sincronizados", () => {
    const a = renderHook(() => useHighlightPref());
    const b = renderHook(() => useHighlightPref());
    act(() => a.result.current[1](true));
    expect(b.result.current[0]).toBe(true);
    act(() => a.result.current[1](false));
  });

  it("con localStorage bloqueado sigue funcionando en la sesión y no lanza", () => {
    const blocked = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    };
    vi.stubGlobal("localStorage", blocked);
    const { result } = renderHook(() => useHighlightPref());
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
  });
});

describe("usePluralPref (RF-41 c5)", () => {
  it("es independiente de la preferencia de colorear y persiste", async () => {
    const { usePluralPref } = await import("./use-highlight-pref");
    const plural = renderHook(() => usePluralPref());
    const color = renderHook(() => useHighlightPref());
    expect(plural.result.current[0]).toBe(false);
    act(() => plural.result.current[1](true));
    expect(localStorage.getItem("my-deutsch:plurals")).toBe("1");
    expect(color.result.current[0]).toBe(false);
    plural.unmount();
    const again = renderHook(() => usePluralPref());
    expect(again.result.current[0]).toBe(true);
    act(() => again.result.current[1](false));
  });
});
