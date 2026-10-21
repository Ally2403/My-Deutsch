import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearFragmentCache } from "@/lib/phrase-translate";
import type { PageData } from "@/lib/domain/page";
import { PageReader } from "./page-reader";

const b = [0.1, 0.1, 0.1, 0.02] as const;

const page: PageData = {
  v: 1,
  size: [1600, 2263],
  lines: [[0, 5]],
  paragraphs: [[0, 5]],
  images: [],
  fields: [],
  tokens: [
    { t: "Der", b },
    { t: "Tisch", b, l: 1 },
    { t: "steht", b },
    { t: "hier.", b },
    { t: "Es", b },
    { t: "regnet.", b },
  ],
  lex: {
    "1": {
      lemma: "Tisch",
      pos: "noun",
      g: ["m"],
      senses: [{ es: "mesa", m: false }],
    },
  },
  sents: [
    { r: [0, 3], es: "La mesa está aquí." },
    { r: [4, 5], es: "Llueve." },
  ],
};

function setup() {
  return render(
    <PageReader
      total={1}
      loadPage={() => Promise.resolve(page)}
      imageUrl={() => "/p/1.webp"}
    />,
  );
}

describe("PageReader: traducir frases (RF-47)", () => {
  beforeEach(() => {
    clearFragmentCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              responseStatus: 200,
              responseData: { translatedText: "la mesa es" },
            }),
          ),
        ),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("en modo «Frase», dos toques abren el panel con la traducción", async () => {
    setup();
    await screen.findByRole("button", { name: "Tisch" });
    fireEvent.click(screen.getByRole("button", { name: "Frase" }));
    fireEvent.click(screen.getByRole("button", { name: "Tisch" }));
    expect(screen.queryByRole("dialog")).toBeNull(); // el primer toque solo fija el inicio
    fireEvent.click(screen.getByRole("button", { name: "Es" }));
    const dialog = screen.getByRole("dialog", {
      name: /traducción de la frase/i,
    });
    expect(dialog).toBeInTheDocument();
    // lo elegido se traduce solo, sin pasar por la oración completa
    expect(await screen.findByText("la mesa es")).toBeInTheDocument();
    expect(screen.queryByText("La mesa está aquí.")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Ver la oración completa" }),
    ).toBeNull();
  });

  it("tocar de nuevo la palabra inicial cancela; Esc cierra el panel", async () => {
    setup();
    await screen.findByRole("button", { name: "Tisch" });
    fireEvent.click(screen.getByRole("button", { name: "Frase" }));
    fireEvent.click(screen.getByRole("button", { name: "Tisch" }));
    fireEvent.click(screen.getByRole("button", { name: "Tisch" })); // cancela
    fireEvent.click(screen.getByRole("button", { name: "steht" })); // nuevo inicio
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "hier." }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sin el modo «Frase», un toque sigue abriendo el panel de palabra", async () => {
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Tisch" }));
    expect(
      screen.getByRole("dialog", { name: "Palabra: Tisch" }),
    ).toBeInTheDocument();
  });

  it("«Traducir la oración» desde el panel de palabra abre el de frase", async () => {
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Tisch" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Traducir la oración" }),
    );
    expect(
      screen.getByRole("dialog", { name: /traducción de la frase/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("La mesa está aquí.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Palabra: Tisch" })).toBeNull();
  });

  it("la tecla T sobre una palabra enfocada abre la oración completa", async () => {
    setup();
    const word = await screen.findByRole("button", { name: "steht" });
    fireEvent.keyDown(word, { key: "t" });
    expect(screen.getByText("La mesa está aquí.")).toBeInTheDocument();
  });

  it("la oración entera y las palabras no hacen peticiones; un trozo pide solo ese trozo", async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            responseStatus: 200,
            responseData: { translatedText: "x" },
          }),
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Tisch" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Traducir la oración" }),
    );
    expect(screen.getByText("La mesa está aquí.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Frase" }));
    fireEvent.click(screen.getByRole("button", { name: "Tisch" }));
    fireEvent.click(screen.getByRole("button", { name: "hier." }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const calls = fetchSpy.mock.calls as unknown as [string][];
    expect(decodeURIComponent(calls[0][0])).toContain("q=Tisch steht hier.");
  });
});
