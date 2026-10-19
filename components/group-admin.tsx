"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, OutlineButton } from "@/components/ui";
import { groupErrorMessage, validateGroupName } from "@/lib/domain/group";
import { createClient } from "@/lib/supabase/client";

type Failure = { code?: string; message?: string };

/** Ejecuta una acción de grupo con estado de carga y mensaje de error en español. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(
    fn: () => PromiseLike<{ error: Failure | null }>,
  ): Promise<boolean> {
    setBusy(true);
    setError(null);
    const { error: e } = await fn();
    setBusy(false);
    if (e) {
      setError(groupErrorMessage(e));
      return false;
    }
    return true;
  }
  return { busy, error, run, setError };
}

/** RF-10: salir del grupo; si era el último administrador, el rol pasa al miembro más antiguo. */
export function LeaveGroup({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  if (!confirming)
    return (
      <OutlineButton onClick={() => setConfirming(true)}>
        Salir del grupo
      </OutlineButton>
    );
  return (
    <div role="group" aria-label="Salir del grupo" className="card p-4">
      <p>
        ¿Salir de «{groupName}»? Dejarás de ver sus libros, pero tu diccionario
        personal se conserva.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-gender-f">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          loading={busy}
          onClick={async () => {
            if (
              await run(() =>
                createClient().rpc("leave_group", { p_group: groupId }),
              )
            )
              router.push("/grupos");
          }}
        >
          Sí, salir
        </Button>
        <OutlineButton disabled={busy} onClick={() => setConfirming(false)}>
          Cancelar
        </OutlineButton>
      </div>
    </div>
  );
}

/** RF-09: renombrar, regenerar el código y eliminar el grupo (solo administradores). */
export function GroupAdminPanel({
  groupId,
  name,
}: {
  groupId: string;
  name: string;
}) {
  const router = useRouter();
  const rename = useAction();
  const regen = useAction();
  const del = useAction();
  const [value, setValue] = useState(name);
  const [saved, setSaved] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");

  async function onRename(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validateGroupName(value.trim());
    if (invalid) return rename.setError(invalid);
    setSaved(false);
    const ok = await rename.run(() =>
      createClient()
        .from("groups")
        .update({ name: value.trim() })
        .eq("id", groupId),
    );
    if (ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <section aria-label="Administrar grupo" className="card mt-8 p-4">
      <h2 className="font-display text-lg font-bold">Administrar grupo</h2>

      <form onSubmit={onRename} className="mt-3 flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          Nombre del grupo
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={60}
          />
        </label>
        {rename.error && (
          <p role="alert" className="text-gender-f">
            {rename.error}
          </p>
        )}
        {saved && <p role="status">Nombre actualizado.</p>}
        <Button type="submit" loading={rename.busy} className="self-start">
          Guardar nombre
        </Button>
      </form>

      <div className="mt-5 border-t border-border pt-4">
        {confirmRegen ? (
          <div role="group" aria-label="Regenerar código">
            <p>
              El código anterior dejará de funcionar de inmediato. ¿Generar uno
              nuevo?
            </p>
            {regen.error && (
              <p role="alert" className="mt-2 text-gender-f">
                {regen.error}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                loading={regen.busy}
                onClick={async () => {
                  if (
                    await regen.run(() =>
                      createClient().rpc("regenerate_invite", {
                        p_group: groupId,
                      }),
                    )
                  ) {
                    setConfirmRegen(false);
                    router.refresh();
                  }
                }}
              >
                Sí, generar código nuevo
              </Button>
              <OutlineButton
                disabled={regen.busy}
                onClick={() => setConfirmRegen(false)}
              >
                Cancelar
              </OutlineButton>
            </div>
          </div>
        ) : (
          <OutlineButton onClick={() => setConfirmRegen(true)}>
            Regenerar código
          </OutlineButton>
        )}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        {confirmDelete ? (
          <div role="group" aria-label="Eliminar grupo">
            <p>
              Se quitarán todos los miembros y los libros dejarán de estar en
              este grupo (se eliminan en 7 días si ningún otro grupo los usa).
              Para confirmar, escribe el nombre del grupo:{" "}
              <strong>{name}</strong>
            </p>
            <label className="sr-only" htmlFor="delete-confirm">
              Nombre del grupo para confirmar
            </label>
            <Input
              id="delete-confirm"
              className="mt-2"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
            {del.error && (
              <p role="alert" className="mt-2 text-gender-f">
                {del.error}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                loading={del.busy}
                disabled={typed.trim() !== name}
                onClick={async () => {
                  if (
                    await del.run(() =>
                      createClient().rpc("delete_group", { p_group: groupId }),
                    )
                  )
                    router.push("/grupos");
                }}
              >
                Eliminar grupo
              </Button>
              <OutlineButton
                disabled={del.busy}
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </OutlineButton>
            </div>
          </div>
        ) : (
          <OutlineButton onClick={() => setConfirmDelete(true)}>
            Eliminar grupo
          </OutlineButton>
        )}
      </div>
    </section>
  );
}

/** RF-09: nombrar o quitar administrador y expulsar a un miembro (solo administradores). */
export function MemberActions({
  groupId,
  userId,
  name,
  role,
}: {
  groupId: string;
  userId: string;
  name: string;
  role: "admin" | "member";
}) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <OutlineButton
          disabled={busy}
          onClick={async () => {
            if (
              await run(() =>
                createClient().rpc("set_member_role", {
                  p_group: groupId,
                  p_user: userId,
                  p_role: role === "admin" ? "member" : "admin",
                }),
              )
            )
              router.refresh();
          }}
        >
          {role === "admin" ? "Quitar administrador" : "Hacer administrador"}
        </OutlineButton>
        {!confirming && (
          <OutlineButton onClick={() => setConfirming(true)}>
            Expulsar
          </OutlineButton>
        )}
      </div>
      {confirming && (
        <div role="group" aria-label={`Expulsar a ${name}`}>
          <p className="text-sm">
            ¿Expulsar a {name}? Perderá el acceso a los libros del grupo;
            conserva su diccionario.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              loading={busy}
              onClick={async () => {
                if (
                  await run(() =>
                    createClient().rpc("remove_member", {
                      p_group: groupId,
                      p_user: userId,
                    }),
                  )
                )
                  router.refresh();
              }}
            >
              Sí, expulsar
            </Button>
            <OutlineButton disabled={busy} onClick={() => setConfirming(false)}>
              Cancelar
            </OutlineButton>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-gender-f">
          {error}
        </p>
      )}
    </div>
  );
}
