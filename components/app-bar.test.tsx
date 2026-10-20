import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let dueCount = 3;
let lastLt: [string, string] | null = null;

vi.mock("@/lib/prefs/client", () => ({ syncPrefsOnce: async () => {} }));
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: {} } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
    },
    from: () => ({
      select: () => ({
        lt: async (c: string, v: string) => {
          lastLt = [c, v];
          return { count: dueCount, error: null };
        },
      }),
    }),
  }),
}));

import { AppBar } from "./app-bar";

describe("RF-48: insignia de vencidas en la barra", () => {
  it("muestra el número de tarjetas vencidas junto a «Repaso»", async () => {
    render(<AppBar />);
    const badge = await screen.findByTestId("due-badge");
    expect(badge.textContent).toContain("3");
    expect(lastLt?.[0]).toBe("due");
    const link = screen.getByRole("link", { name: /Repaso/ });
    expect(link.getAttribute("href")).toBe("/repaso");
  });

  it("sin vencidas no hay insignia", async () => {
    dueCount = 0;
    render(<AppBar />);
    await screen.findByRole("link", { name: /Repaso/ });
    await waitFor(() => expect(lastLt).not.toBeNull());
    expect(screen.queryByTestId("due-badge")).toBeNull();
  });
});
