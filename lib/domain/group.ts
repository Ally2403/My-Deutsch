/** RF-06: el nombre del grupo tiene entre 3 y 60 caracteres. Devuelve el mensaje de error o null. */
export function validateGroupName(name: string): string | null {
  const length = name.trim().length;
  if (length < 3 || length > 60)
    return "El nombre debe tener entre 3 y 60 caracteres.";
  return null;
}

/** RN-09: los códigos son de 8 caracteres sin 0/O/1/I; se aceptan en minúsculas y con espacios o guiones. */
export function normalizeInviteCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidInviteCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code);
}

/** Traduce los errores de las funciones SQL de grupos a mensajes para la usuaria. */
export function groupErrorMessage(error: {
  code?: string;
  message?: string;
}): string {
  if (error.message === "invalid_code") return "Código no válido";
  if (error.message === "group_full") return "El grupo está lleno";
  if (error.message === "too_many_attempts")
    return "Demasiados intentos, inténtalo más tarde";
  if (error.message === "last_admin")
    return "El grupo necesita al menos un administrador";
  if (error.message === "forbidden" || error.code === "42501")
    return "Solo un administrador puede hacerlo";
  return "No pudimos completar la acción. Inténtalo de nuevo.";
}

export function inviteLink(origin: string, code: string): string {
  return `${origin}/unirse/${code}`;
}
