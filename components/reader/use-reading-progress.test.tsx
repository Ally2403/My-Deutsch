import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReadingProgress } from "./use-reading-progress";

describe("useReadingProgress (RF-20, RN-14)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("guarda la última página tras una pausa, una sola vez por ráfaga de cambios", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useReadingProgress({ save, initialPagesRead: [] }));
    act(() => {
      result.current(2);
      result.current(3);
      result.current(4);
    });
    expect(save).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1000));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ lastPage: 4, pagesRead: [] });
  });

  it("marca como leída la página en la que se permanece 10 s", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useReadingProgress({ save, initialPagesRead: [1] }));
    act(() => result.current(2));
    act(() => void vi.advanceTimersByTime(10_000));
    act(() => void vi.advanceTimersByTime(1000));
    expect(save).toHaveBeenLastCalledWith({ lastPage: 2, pagesRead: [1, 2] });
  });

  it("no marca como leída una página que se deja antes de 10 s", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useReadingProgress({ save, initialPagesRead: [] }));
    act(() => result.current(2));
    act(() => void vi.advanceTimersByTime(5000));
    act(() => result.current(3));
    act(() => void vi.advanceTimersByTime(9000));
    expect(save).toHaveBeenLastCalledWith({ lastPage: 3, pagesRead: [] });
  });

  it("un fallo al guardar no rompe la lectura y al salir se guarda lo pendiente", async () => {
    const save = vi.fn().mockRejectedValue(new Error("red"));
    const { result, unmount } = renderHook(() =>
      useReadingProgress({ save, initialPagesRead: [] }),
    );
    act(() => result.current(5));
    unmount();
    expect(save).toHaveBeenCalledWith({ lastPage: 5, pagesRead: [] });
  });
});
