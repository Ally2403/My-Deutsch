import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
const update = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({ update: (v: unknown) => ({ eq: (...a: unknown[]) => update(v, ...a) }) }),
  }),
}));

import { DeleteAccount, ProfileForm } from "./profile-form";

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({ error: null });
});

describe("ProfileForm (RF-05 c1)", () => {
  it("valida el nombre y guarda nombre y nivel", async () => {
    render(<ProfileForm userId="u1" displayName="Ana" level={null} />);
    fireEvent.change(screen.getByLabelText(/Nombre visible/), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("al menos 2");
    expect(update).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Nombre visible/), { target: { value: " Ana Ruiz " } });
    fireEvent.change(screen.getByLabelText("Nivel de alemán"), { target: { value: "B1" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ display_name: "Ana Ruiz", level: "B1" }, "id", "u1"),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Perfil guardado");
    expect(refresh).toHaveBeenCalled();
  });

  it("avisa si no se pudo guardar", async () => {
    update.mockResolvedValue({ error: new Error("x") });
    render(<ProfileForm userId="u1" displayName="Ana" level="B2" />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
  });
});

describe("DeleteAccount (RF-05 c2)", () => {
  it("exige escribir ELIMINAR y llama a la API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<DeleteAccount />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
    const go = screen.getByRole("button", { name: "Eliminar cuenta definitivamente" });
    expect(go).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Escribe ELIMINAR/), { target: { value: "eliminar" } });
    expect(go).toBeEnabled();
    fireEvent.click(go);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cuenta/eliminar",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ confirm: "eliminar" }) }),
    );
    vi.unstubAllGlobals();
  });

  it("si la API falla avisa y no sale de la pantalla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<DeleteAccount />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
    fireEvent.change(screen.getByLabelText(/Escribe ELIMINAR/), { target: { value: "ELIMINAR" } });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar cuenta definitivamente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo eliminar la cuenta");
    expect(push).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
