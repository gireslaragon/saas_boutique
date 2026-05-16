import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash un mot de passe en clair
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare un mot de passe en clair avec son hash
 * Retourne true si correspond
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Vérifie la complexité minimale d'un mot de passe
 * Retourne un message d'erreur ou null si valide
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Le mot de passe doit faire au moins 8 caractères";
  if (!/[A-Z]/.test(password)) return "Le mot de passe doit contenir au moins une majuscule";
  if (!/[0-9]/.test(password)) return "Le mot de passe doit contenir au moins un chiffre";
  return null;
}