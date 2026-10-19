import { describe, expect, it, vi } from "vitest";
import { deleteAccount } from "./delete-account";

describe("deleteAccount (RF-05 c2)", () => {
  it("sale de cada grupo y después borra al usuario", async () => {
    const order: string[] = [];
    const r = await deleteAccount({
      groupIds: async () => ["g1", "g2"],
      leaveGroup: async (id) => void order.push(`leave:${id}`),
      deleteUser: async () => void order.push("delete"),
    });
    expect(r).toEqual({ ok: true });
    expect(order).toEqual(["leave:g1", "leave:g2", "delete"]);
  });

  it("si no puede salir de un grupo no borra la cuenta", async () => {
    const deleteUser = vi.fn();
    const r = await deleteAccount({
      groupIds: async () => ["g1"],
      leaveGroup: async () => {
        throw new Error("x");
      },
      deleteUser,
    });
    expect(r).toEqual({ ok: false, error: "leave_failed", status: 500 });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("informa si falla el borrado del usuario", async () => {
    const r = await deleteAccount({
      groupIds: async () => [],
      leaveGroup: async () => {},
      deleteUser: async () => {
        throw new Error("x");
      },
    });
    expect(r).toEqual({ ok: false, error: "delete_failed", status: 500 });
  });
});
