"use server";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq, and } from "drizzle-orm";
import { guardAction } from "@/lib/auth/role-guards";
import { verifyPassword, hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { z } from "zod";

export async function getProfileAction() {
  const auth = await guardAction();
  if (!auth.success) return auth;

  const [user] = await db
    .select({
      id:          users.id,
      firstName:   users.firstName,
      lastName:    users.lastName,
      email:       users.email,
      role:        users.role,
      status:      users.status,
      hiredAt:     users.hiredAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.id, auth.data.id))
    .limit(1);

  if (!user) return { success: false as const, error: "Utilisateur introuvable" };

  return {
    success: true as const,
    data: {
      ...user,
      hiredAt:     user.hiredAt?.toISOString()     ?? "",
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    },
  };
}

const updateProfileSchema = z.object({
  firstName: z.string().min(2, "Prénom trop court"),
  lastName:  z.string().min(2, "Nom trop court"),
});

export async function updateProfileAction(input: z.infer<typeof updateProfileSchema>) {
  const auth = await guardAction();
  if (!auth.success) return auth;

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  await db.update(users)
    .set({ firstName: parsed.data.firstName, lastName: parsed.data.lastName, updatedAt: new Date() })
    .where(eq(users.id, auth.data.id));

  return { success: true as const };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword:     z.string().min(8, "Au moins 8 caractères"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path:    ["confirmPassword"],
});

export async function changePasswordAction(input: z.infer<typeof changePasswordSchema>) {
  const auth = await guardAction();
  if (!auth.success) return auth;

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  // Vérifie complexité
  const strengthError = validatePasswordStrength(parsed.data.newPassword);
  if (strengthError) return { success: false as const, error: strengthError };

  // Vérifie l'ancien mot de passe
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, auth.data.id))
    .limit(1);

  if (!user) return { success: false as const, error: "Utilisateur introuvable" };

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { success: false as const, error: "Mot de passe actuel incorrect" };

  const newHash = await hashPassword(parsed.data.newPassword);

  await db.update(users)
    .set({
      passwordHash:          newHash,
      // Invalide tous les refresh tokens (force reconnexion sur autres appareils)
      refreshTokenHash:      null,
      refreshTokenExpiresAt: null,
      updatedAt:             new Date(),
    })
    .where(eq(users.id, auth.data.id));

  return { success: true as const };
}
