"use server";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { sales } from "@/db/schema/sales";
import { events } from "@/db/schema/events";
import { guardAdminAction } from "@/lib/auth/role-guards";
import { hashPassword } from "@/lib/auth/password";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

// ─── Liste caissières ─────────────────────────────────────────────────────────

export async function getCashiersAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;

  const cashiers = await db
    .select({
      id:                users.id,
      firstName:         users.firstName,
      lastName:          users.lastName,
      email:             users.email,
      status:            users.status,
      hiredAt:           users.hiredAt,
      deactivatedAt:     users.deactivatedAt,
      deactivationReason: users.deactivationReason,
      lastLoginAt:       users.lastLoginAt,
      // Stats globales via sous-requête
      totalSales: sql<number>`(
        select count(*) from sales s
        where s.cashier_id = ${users.id} and s.status = 'completed'
      )`,
      totalRevenue: sql<number>`(
        select coalesce(sum(s.total_amount), 0) from sales s
        where s.cashier_id = ${users.id} and s.status = 'completed'
      )`,
    })
    .from(users)
    .where(and(
      eq(users.tenantId, tenantId),
      eq(users.role, "cashier"),
    ))
    .orderBy(desc(users.hiredAt));

  return {
    success: true as const,
    data: cashiers.map((c) => ({
      ...c,
      hiredAt:       c.hiredAt?.toISOString()       ?? "",
      deactivatedAt: c.deactivatedAt?.toISOString() ?? null,
      lastLoginAt:   c.lastLoginAt?.toISOString()   ?? null,
      totalSales:    Number(c.totalSales),
      totalRevenue:  Number(c.totalRevenue),
    })),
  };
}

// ─── Ajouter une caissière ────────────────────────────────────────────────────

const addCashierSchema = z.object({
  firstName: z.string().min(2, "Prénom requis"),
  lastName:  z.string().min(2, "Nom requis"),
  email:     z.string().email("Email invalide"),
  password:  z.string().min(8, "Au moins 8 caractères"),
});

export async function addCashierAction(input: z.infer<typeof addCashierSchema>) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId, id: adminId } = auth.data;

  const parsed = addCashierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  // Vérifie unicité email dans le tenant
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, parsed.data.email)))
    .limit(1);

  if (existing.length > 0) {
    return { success: false as const, error: "Cet email est déjà utilisé dans votre boutique" };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const [cashier] = await db.insert(users).values({
    tenantId,
    firstName:    parsed.data.firstName,
    lastName:     parsed.data.lastName,
    email:        parsed.data.email,
    passwordHash,
    role:         "cashier",
    status:       "active",
  }).returning({ id: users.id });

  await db.insert(events).values({
    tenantId,
    eventType:   "USER_CREATED",
    triggeredBy: adminId,
    userId:      cashier.id,
    payload:     { email: parsed.data.email, role: "cashier" },
  });

  return { success: true as const, data: { id: cashier.id } };
}

// ─── Désactiver / Réactiver ───────────────────────────────────────────────────

const toggleSchema = z.object({
  cashierId: z.string().uuid(),
  action:    z.enum(["deactivate", "reactivate"]),
  reason:    z.string().optional(),
});

export async function toggleCashierAction(input: z.infer<typeof toggleSchema>) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId, id: adminId } = auth.data;

  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Données invalides" };

  const { cashierId, action, reason } = parsed.data;
  const isDeactivating = action === "deactivate";

  await db.update(users)
    .set({
      status:             isDeactivating ? "inactive" : "active",
      deactivatedAt:      isDeactivating ? new Date() : null,
      deactivationReason: isDeactivating ? (reason ?? null) : null,
      // Invalide le refresh token immédiatement
      refreshTokenHash:      isDeactivating ? null : undefined,
      refreshTokenExpiresAt: isDeactivating ? null : undefined,
      updatedAt: new Date(),
    })
    .where(and(
      eq(users.id,       cashierId),
      eq(users.tenantId, tenantId),
      eq(users.role,     "cashier"),
    ));

  await db.insert(events).values({
    tenantId,
    eventType:   isDeactivating ? "USER_DEACTIVATED" : "USER_REACTIVATED",
    triggeredBy: adminId,
    userId:      cashierId,
    payload:     { reason, action },
  });

  return { success: true as const };
}

// ─── Réinitialiser mot de passe ───────────────────────────────────────────────

export async function resetCashierPasswordAction(cashierId: string, newPassword: string) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;

  if (newPassword.length < 8) {
    return { success: false as const, error: "Mot de passe trop court (min 8 caractères)" };
  }

  const passwordHash = await hashPassword(newPassword);

  await db.update(users)
    .set({
      passwordHash,
      refreshTokenHash:      null,
      refreshTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(users.id,       cashierId),
      eq(users.tenantId, tenantId),
      eq(users.role,     "cashier"),
    ));

  return { success: true as const };
}