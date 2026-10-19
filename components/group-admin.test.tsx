import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
const rpc = vi.fn();
const update = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: (...a: unknown[]) => rpc(...a),
    from: () => ({
      update: (v: unknown) => ({
        eq: (...a: unknown[]) => update(v, ...a),
      }),
    }),
  }),
}));

import { GroupAdminPanel, LeaveGroup, MemberActions } from "./group-admin";

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ error: null });
  update.mockResolvedValue({ error: null });
});

describe("LeaveGroup (RF-10)", () => {
  it("pide confirmación, sale del grupo y vuelve a «Mis grupos»", async () => {
    render(<LeaveGroup groupId="g1" groupName="Curso B1" />);
    fireEvent.click(screen.getByRole("button", { name: "Salir del grupo" }));
    expect(
      screen.getByText(/diccionario personal se conserva/),
    ).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sí, salir" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/grupos"));
    expect(rpc).toHaveBeenCalledWith("leave_group", { p_group: "g1" });
  });

  it("si falla avisa y se queda", async () => {
    rpc.mockResolvedValue({ error: { message: "x" } });
    render(<LeaveGroup groupId="g1" groupName="Curso B1" />);
    fireEvent.click(screen.getByRole("button", { name: "Salir del grupo" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, salir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos completar la acción",
    );
    expect(push).not.toHaveBeenCalled();
  });
});

describe("GroupAdminPanel (RF-09)", () => {
  it("renombra con validación de 3 a 60 caracteres", async () => {
    render(<GroupAdminPanel groupId="g1" name="Curso B1" />);
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), {
      target: { value: "ab" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), {
      target: { value: "Alemán B1 – 2027" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        { name: "Alemán B1 – 2027" },
        "id",
        "g1",
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Nombre actualizado",
    );
  });

  it("regenerar el código avisa de que el anterior deja de funcionar y pide confirmación", async () => {
    render(<GroupAdminPanel groupId="g1" name="Curso B1" />);
    fireEvent.click(screen.getByRole("button", { name: "Regenerar código" }));
    expect(
      screen.getByText(/código anterior dejará de funcionar/),
    ).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Sí, generar código nuevo" }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledWith("regenerate_invite", { p_group: "g1" });
  });

  it("eliminar exige escribir el nombre del grupo", async () => {
    render(<GroupAdminPanel groupId="g1" name="Curso B1" />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar grupo" }));
    const go = screen.getAllByRole("button", { name: "Eliminar grupo" })[0];
    expect(go).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Nombre del grupo para confirmar"), {
      target: { value: "Curso B1" },
    });
    expect(go).toBeEnabled();
    fireEvent.click(go);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/grupos"));
    expect(rpc).toHaveBeenCalledWith("delete_group", { p_group: "g1" });
  });

  it("el servidor rechaza a quien no es administrador y se muestra el motivo", async () => {
    rpc.mockResolvedValue({ error: { code: "42501", message: "forbidden" } });
    render(<GroupAdminPanel groupId="g1" name="Curso B1" />);
    fireEvent.click(screen.getByRole("button", { name: "Regenerar código" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Sí, generar código nuevo" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Solo un administrador puede hacerlo",
    );
  });
});

describe("MemberActions (RF-09)", () => {
  it("nombra administrador a un miembro y quita el rol a un administrador", async () => {
    const { unmount } = render(
      <MemberActions groupId="g1" userId="u2" name="Ana" role="member" />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Hacer administrador" }),
    );
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("set_member_role", {
        p_group: "g1",
        p_user: "u2",
        p_role: "admin",
      }),
    );
    unmount();
    render(<MemberActions groupId="g1" userId="u2" name="Ana" role="admin" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Quitar administrador" }),
    );
    await waitFor(() =>
      expect(rpc).toHaveBeenLastCalledWith("set_member_role", {
        p_group: "g1",
        p_user: "u2",
        p_role: "member",
      }),
    );
  });

  it("expulsar pide confirmación y explica que conserva su diccionario", async () => {
    render(<MemberActions groupId="g1" userId="u2" name="Ana" role="member" />);
    fireEvent.click(screen.getByRole("button", { name: "Expulsar" }));
    expect(screen.getByText(/conserva su diccionario/)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sí, expulsar" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("remove_member", {
        p_group: "g1",
        p_user: "u2",
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("no se puede dejar al grupo sin administrador", async () => {
    rpc.mockResolvedValue({ error: { message: "last_admin" } });
    render(<MemberActions groupId="g1" userId="u2" name="Ana" role="admin" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Quitar administrador" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "al menos un administrador",
    );
  });
});
