/** RF-05: validaciones del perfil. */

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];

export const DELETE_PHRASE = "ELIMINAR";

export function validateDisplayName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < 2) return "El nombre debe tener al menos 2 caracteres";
  if (name.length > 60) return "El nombre no puede superar 60 caracteres";
  return null;
}

export function parseLevel(raw: string | null | undefined): Level | null {
  return LEVELS.find((l) => l === raw) ?? null;
}

/** La cuenta solo se elimina con la palabra exacta (sin importar espacios ni mayúsculas). */
export function isDeleteConfirmed(typed: string): boolean {
  return typed.trim().toUpperCase() === DELETE_PHRASE;
}
