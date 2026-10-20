import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePhraseSelection } from "./use-phrase-selection";

function setup(enabled = true) {
  const { container } = render(
    <div id="layer" lang="de">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} data-token={i}>
          palabra{i}
        </span>
      ))}
      <p id="outside">fuera</p>
    </div>,
  );
  const layer = container.querySelector<HTMLElement>("#layer")!;
  const ref = createRef<HTMLElement>();
  (ref as { current: HTMLElement | null }).current = layer;
  const hook = renderHook(
    ({ on }) => usePhraseSelection(ref, { enabled: on }),
    { initialProps: { on: enabled } },
  );
  return { container, layer, hook };
}

function mockSelection(anchor: Node | null, focus: Node | null) {
  const removeAllRanges = vi.fn();
  vi.spyOn(window, "getSelection").mockReturnValue({
    isCollapsed: false,
    anchorNode: anchor,
    focusNode: focus,
    rangeCount: 1,
    getRangeAt: () => ({
      getBoundingClientRect: () => new DOMRect(1, 2, 3, 4),
    }),
    removeAllRanges,
  } as unknown as Selection);
  return removeAllRanges;
}

const span = (c: HTMLElement, i: number) =>
  c.querySelector<HTMLElement>(`[data-token="${i}"]`)!;
const mouseUp = () =>
  act(() => {
    fireEvent.pointerUp(document, { pointerType: "mouse" });
  });

afterEach(() => vi.restoreAllMocks());

describe("usePhraseSelection (RF-47)", () => {
  it("un arrastre de la palabra 3 a la 8 da el rango [3, 8] y quita la selección nativa", () => {
    const { container, hook } = setup();
    const removeAll = mockSelection(
      span(container, 3).firstChild,
      span(container, 8).firstChild,
    );
    mouseUp();
    expect(hook.result.current.selection?.range).toEqual([3, 8]);
    expect(removeAll).toHaveBeenCalled();
  });

  it("una selección invertida también da el rango ordenado", () => {
    const { container, hook } = setup();
    mockSelection(span(container, 8), span(container, 3));
    mouseUp();
    expect(hook.result.current.selection?.range).toEqual([3, 8]);
  });

  it("un clic simple o una sola palabra no abre el panel de frase", () => {
    const { container, hook } = setup();
    mockSelection(span(container, 4).firstChild, span(container, 4).firstChild);
    mouseUp();
    expect(hook.result.current.selection).toBeNull();
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: true,
    } as unknown as Selection);
    mouseUp();
    expect(hook.result.current.selection).toBeNull();
  });

  it("ignora los toques (solo el mouse) y las selecciones fuera de la capa", () => {
    const { container, hook } = setup();
    mockSelection(span(container, 1), span(container, 5));
    act(() => {
      fireEvent.pointerUp(document, { pointerType: "touch" });
    });
    expect(hook.result.current.selection).toBeNull();
    mockSelection(span(container, 1), container.querySelector("#outside"));
    mouseUp();
    expect(hook.result.current.selection).toBeNull();
  });

  it("con enabled=false no hace nada", () => {
    const { container, hook } = setup(false);
    mockSelection(span(container, 1), span(container, 5));
    mouseUp();
    expect(hook.result.current.selection).toBeNull();
  });

  it("clear() limpia la selección", () => {
    const { container, hook } = setup();
    mockSelection(span(container, 1), span(container, 5));
    mouseUp();
    expect(hook.result.current.selection).not.toBeNull();
    act(() => hook.result.current.clear());
    expect(hook.result.current.selection).toBeNull();
  });
});
