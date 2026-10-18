/** RF-11: Supabase responde 409 al crear un objeto que ya existe (x-upsert: false). */
export function tusErrorStatus(err: unknown): number | null {
  const res = (err as { originalResponse?: { getStatus?: () => number } })
    ?.originalResponse;
  return typeof res?.getStatus === "function" ? res.getStatus() : null;
}

export const isObjectAlreadyExists = (err: unknown) => tusErrorStatus(err) === 409;
