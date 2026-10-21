import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstallCard } from "./install-card";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";

function setEnv(opts: { ua?: string; standalone?: boolean }) {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: opts.ua ?? "Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile",
  });
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: !!opts.standalone && q.includes("standalone"),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => setEnv({}));
afterEach(() => vi.restoreAllMocks());

describe("InstallCard (RF-50 c5)", () => {
  it("Android: aparece el botón al recibir beforeinstallprompt y lo usa", async () => {
    render(<InstallCard />);
    expect(
      screen.queryByText("Instalar en tu celular"),
    ).not.toBeInTheDocument();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const ev = Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    await act(async () => {
      window.dispatchEvent(ev);
    });
    const btn = await screen.findByRole("button", { name: "Instalar la app" });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(prompt).toHaveBeenCalled();
  });

  it("iPhone: muestra los pasos de Safari y no hay botón", async () => {
    setEnv({ ua: IPHONE });
    render(<InstallCard />);
    expect(await screen.findByText(/Compartir/)).toBeInTheDocument();
    expect(screen.getByText(/Añadir a pantalla de inicio/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("ya instalada: no se muestra nada", async () => {
    setEnv({ ua: IPHONE, standalone: true });
    const { container } = render(<InstallCard />);
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });
});
