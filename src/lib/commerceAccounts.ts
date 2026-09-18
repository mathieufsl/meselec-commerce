/** Règles partagées pour la gestion des comptes commerce (UI + tests). */

export const COMMERCE_PASSWORD_MIN_LENGTH = 8;

export function normalizeCommerceEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidCommerceEmail(email: string): boolean {
  const value = normalizeCommerceEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateCommercePassword(
  password: string,
  confirm?: string,
): string | null {
  if (password.length < COMMERCE_PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${COMMERCE_PASSWORD_MIN_LENGTH} caractères`;
  }
  if (confirm !== undefined && password !== confirm) {
    return "Les mots de passe ne correspondent pas";
  }
  return null;
}

export function commerceAccountDisplayName(input: {
  prenom?: string | null;
  nom?: string | null;
}): string {
  const name = [input.prenom, input.nom].filter(Boolean).join(" ").trim();
  return name || "—";
}
