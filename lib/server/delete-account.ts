/** RF-05: eliminar la cuenta. Antes de borrar, la persona sale de sus grupos con `leave_group`
 *  (RN-08: si era la última administradora, el rol pasa al miembro más antiguo). Después se borra
 *  el usuario de Auth: las FK en cascada eliminan su diccionario, progreso y anotaciones, y los
 *  libros que subió permanecen en los grupos (`uploaded_by` pasa a nulo). */

export type DeleteAccountDeps = {
  /** Ids de los grupos de la persona (con su propia sesión). */
  groupIds(): Promise<string[]>;
  leaveGroup(groupId: string): Promise<void>;
  /** Borra el usuario con la service role key. */
  deleteUser(): Promise<void>;
};

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: "leave_failed" | "delete_failed"; status: 500 };

export async function deleteAccount(deps: DeleteAccountDeps): Promise<DeleteAccountResult> {
  try {
    for (const id of await deps.groupIds()) await deps.leaveGroup(id);
  } catch {
    return { ok: false, error: "leave_failed", status: 500 };
  }
  try {
    await deps.deleteUser();
  } catch {
    return { ok: false, error: "delete_failed", status: 500 };
  }
  return { ok: true };
}
