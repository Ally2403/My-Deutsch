import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// RF-50 c3/c4: registro solo en producción, aviso de usuaria y de versión nueva.
let authCb: (e: string, s: { user: { id: string } } | null) => void = () => {};
let session: { user: { id: string } } | null = { user: { id: "user-a" } };
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: (cb: typeof authCb) => {
        authCb = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  }),
}));

import { PwaRegister } from "./pwa-register";

const active = { postMessage: vi.fn() };
let reg: Record<string, unknown>;
const register = vi.fn();

beforeEach(() => {
  active.postMessage.mockClear();
  reg = { active, waiting: null, installing: null, addEventListener: vi.fn() };
  register.mockReset().mockResolvedValue(reg);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register,
      ready: Promise.resolve(reg),
      controller: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("PwaRegister", () => {
  it("no registra nada fuera de producción", async () => {
    vi.stubEnv("NODE_ENV", "test");
    render(<PwaRegister />);
    await act(async () => {});
    expect(register).not.toHaveBeenCalled();
  });

  it("en producción registra, avisa la usuaria y purga al cerrar sesión", async () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<PwaRegister />);
    await act(async () => {});
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    expect(active.postMessage).toHaveBeenCalledWith({
      type: "user",
      id: "user-a",
    });
    session = null;
    await act(async () => {
      authCb("SIGNED_OUT", null);
    });
    expect(active.postMessage).toHaveBeenLastCalledWith({ type: "purge" });
  });

  it("muestra «Hay una versión nueva» cuando hay un worker en espera", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const waiting = { postMessage: vi.fn() };
    reg.waiting = waiting;
    render(<PwaRegister />);
    await act(async () => {});
    const btn = await screen.findByRole("button", { name: "Actualizar" });
    expect(screen.getByText(/Hay una versión nueva/)).toBeInTheDocument();
    btn.click();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "skip-waiting" });
  });
});
