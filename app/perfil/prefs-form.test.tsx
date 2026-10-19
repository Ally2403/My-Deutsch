import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updates: unknown[] = [];
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { prefs: {} } }) }) }),
      update: (v: unknown) => ({
        eq: async () => {
          updates.push(v);
          return { error: null };
        },
      }),
    }),
  }),
}));

import { PrefsForm } from "./prefs-form";
import { DEFAULT_PREFS } from "@/lib/domain/prefs";

beforeEach(() => {
  updates.length = 0;
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("PrefsForm (RF-37)", () => {
  it("guarda las preferencias en el perfil y las aplica a este dispositivo", async () => {
    render(<PrefsForm initial={DEFAULT_PREFS} />);
    fireEvent.change(screen.getByLabelText("Tema"), { target: { value: "dark" } });
    fireEvent.change(screen.getByLabelText("Tamaño de letra del modo lectura"), { target: { value: "xl" } });
    fireEvent.click(screen.getByLabelText("Colorear sustantivos por defecto"));
    fireEvent.click(screen.getByLabelText("Marcar palabras vistas por defecto")); // la apaga
    fireEvent.click(screen.getByRole("button", { name: "Guardar preferencias" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Preferencias guardadas"));
    expect(updates).toEqual([
      { prefs: { theme: "dark", fontSize: "xl", highlight: true, seenMarks: false } },
    ]);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("my-deutsch:highlight")).toBe("1");
    expect(localStorage.getItem("my-deutsch:hide-seen")).toBe("1");
  });
});
