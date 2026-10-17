/** RF-01: ≥ 8 caracteres con al menos una letra y un número. Devuelve el mensaje de error o null. */
export function validatePassword(password: string): string | null {
  if (password.length < 8)
    return "La contraseña debe tener al menos 8 caracteres.";
  if (!/\p{L}/u.test(password))
    return "La contraseña debe incluir al menos una letra.";
  if (!/\p{N}/u.test(password))
    return "La contraseña debe incluir al menos un número.";
  return null;
}
