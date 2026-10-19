import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Annotation } from "@/lib/domain/annotation";
import { createAnnotationSync, type Remote, type Store } from "@/lib/annotations/sync";
import { AnnotationLayer } from "./annotation-layer";

const rectOf = () =>
  ({ left: 0, top: 0, width: 400, height: 800, right: 400, bottom: 800, x: 0, y: 0, toJSON() {} }) as DOMRect;

function setup(over: Partial<Parameters<typeof AnnotationLayer>[0]> = {}, seed: Annotation[] = []) {
  const data = new Map<string, unknown>();
  if (seed.length) data.set("page:1", seed);
  const store: Store = {
    get: async (k) => data.get(k),
    set: async (k, v) => void data.set(k, structuredClone(v)),
  };
  const remote: Remote = {
    load: vi.fn(async () => seed),
    upsert: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    clearPage: vi.fn(async () => {}),
  };
  const sync = createAnnotationSync({ store, remote, debounceMs: 50 });
  const utils = render(<AnnotationLayer sync={sync} page={1} writeMode visible {...over} />);
  const layer = screen.getByTestId("annotation-layer");
  layer.getBoundingClientRect = rectOf;
  return { sync, remote, layer, ...utils };
}

beforeEach(() => vi.clearAllMocks());

describe("AnnotationLayer (RF-33)", () => {
  it("en modo Escribir, tocar crea un cuadro en coordenadas relativas y lo guarda", async () => {
    const { layer, sync } = setup();
    fireEvent.click(layer, { clientX: 200, clientY: 400 });
    const box = await screen.findByRole("textbox", { name: "Respuesta" });
    fireEvent.change(box, { target: { value: "der Tisch" } });
    await waitFor(async () => {
      const saved = await sync.get(1);
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ x: 0.5, y: 0.5, text: "der Tisch", kind: "free" });
    });
  });

  it("fuera del modo Escribir la capa no captura toques (se consultan palabras)", () => {
    const { layer } = setup({ writeMode: false });
    expect(layer.className).toContain("pointer-events-none");
  });

  it("con el interruptor apagado no muestra las respuestas", async () => {
    const a: Annotation = { id: "a", page: 1, x: 0.1, y: 0.1, text: "hola", kind: "free" };
    const { rerender, sync } = setup({}, [a]);
    expect(await screen.findByDisplayValue("hola")).toBeInTheDocument();
    rerender(<AnnotationLayer sync={sync} page={1} writeMode={false} visible={false} />);
    expect(screen.queryByDisplayValue("hola")).not.toBeInTheDocument();
  });

  it("el botón Borrar quita la respuesta", async () => {
    const a: Annotation = { id: "a", page: 1, x: 0.1, y: 0.1, text: "hola", kind: "free" };
    const { sync } = setup({}, [a]);
    fireEvent.click(await screen.findByRole("button", { name: "Borrar respuesta" }));
    await waitFor(async () => expect(await sync.get(1)).toEqual([]));
  });

  it("vaciar el texto de un cuadro lo elimina al salir del campo", async () => {
    const a: Annotation = { id: "a", page: 1, x: 0.1, y: 0.1, text: "hola", kind: "free" };
    const { sync } = setup({}, [a]);
    const box = await screen.findByDisplayValue("hola");
    fireEvent.change(box, { target: { value: "" } });
    fireEvent.blur(box);
    await waitFor(async () => expect(await sync.get(1)).toEqual([]));
  });
});
