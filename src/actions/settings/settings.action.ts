"use server";

import { db } from "@/db";
import { tenants } from "@/db/schema/tenants";
import { events } from "@/db/schema/events";
import { categories } from "@/db/schema/categories";
import { guardAdminAction } from "@/lib/auth/role-guards";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const settingsSchema = z.object({
  name:                   z.string().min(2, "Nom requis"),
  slogan:                 z.string().max(255).optional(),
  phone:                  z.string().max(30).optional(),
  address:                z.string().optional(),
  city:                   z.string().max(100).optional(),
  invoicePrefix:          z.string().max(20).min(1, "Préfixe requis"),
  groupInvoiceThreshold:  z.coerce.number().int().min(0),
  sessionTimeoutMinutes:  z.coerce.number().int().min(5).max(480),
  currency:               z.string().max(10).default("FCFA"),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export async function getSettingsAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, auth.data.tenantId))
    .limit(1);

  if (!tenant) return { success: false as const, error: "Boutique introuvable" };

  return { success: true as const, data: tenant };
}

export async function updateSettingsAction(input: SettingsInput) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId, id: userId } = auth.data;

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  await db.update(tenants)
    .set({
      name:                  parsed.data.name,
      slogan:                parsed.data.slogan ?? null,
      phone:                 parsed.data.phone ?? null,
      address:               parsed.data.address ?? null,
      city:                  parsed.data.city ?? null,
      invoicePrefix:         parsed.data.invoicePrefix,
      groupInvoiceThreshold: parsed.data.groupInvoiceThreshold,
      sessionTimeoutMinutes: parsed.data.sessionTimeoutMinutes,
      currency:              parsed.data.currency,
      updatedAt:             new Date(),
    })
    .where(eq(tenants.id, tenantId));

  await db.insert(events).values({
    tenantId,
    eventType:   "TENANT_SETTINGS_UPDATED",
    triggeredBy: userId,
    payload:     { ...parsed.data },
  });

  return { success: true as const };
}

// ── Gestion catégories ────────────────────────────────────────────────────────

const categorySchema = z.object({
  name:  z.string().min(2, "Nom requis"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide"),
});

export async function createCategoryAction(input: z.infer<typeof categorySchema>) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  const [cat] = await db.insert(categories).values({
    tenantId:  auth.data.tenantId,
    name:      parsed.data.name,
    color:     parsed.data.color,
    isDefault: false,
  }).returning({ id: categories.id });

  return { success: true as const, data: { id: cat.id } };
}

export async function deleteCategoryAction(categoryId: string) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  // Sécurité : ne pas supprimer les catégories par défaut
  const [cat] = await db
    .select({ isDefault: categories.isDefault })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.tenantId, auth.data.tenantId)))
    .limit(1);

  if (!cat) return { success: false as const, error: "Catégorie introuvable" };
  if (cat.isDefault) return { success: false as const, error: "Les catégories par défaut ne peuvent pas être supprimées" };

  await db.delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.tenantId, auth.data.tenantId)));

  return { success: true as const };
}