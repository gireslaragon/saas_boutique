"use server";

import { db } from "@/db";
import { sales } from "@/db/schema/sales";
import { saleItems } from "@/db/schema/sale-items";
import { users } from "@/db/schema/users";
import { groupInvoices } from "@/db/schema/group-invoices";
import { tenants } from "@/db/schema/tenants";
import { guardAdminAction } from "@/lib/auth/role-guards";
import { eq, and, gte, lt, desc, sql } from "drizzle-orm";

// ─── Liste factures ───────────────────────────────────────────────────────────

export type InvoicePeriod = "today" | "month" | "custom";

export async function getInvoicesAction(
  period: InvoicePeriod = "today",
  customStart?: Date,
  customEnd?: Date,
) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;

  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  if (period === "today") {
    startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    startDate = customStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
    endDate   = customEnd   ?? now;
  }

  const rows = await db
    .select({
      id:            sales.id,
      invoiceNumber: sales.invoiceNumber,
      status:        sales.status,
      totalAmount:   sales.totalAmount,
      amountReceived: sales.amountReceived,
      changeGiven:   sales.changeGiven,
      createdAt:     sales.createdAt,
      groupInvoiceId: sales.groupInvoiceId,
      cashierFirst:  users.firstName,
      cashierLast:   users.lastName,
      // Bénéfice estimé de la vente
      profit: sql<number>`(
        select coalesce(sum((si.unit_price - si.cost_price_at_sale) * si.qty), 0)
        from sale_items si where si.sale_id = ${sales.id}
      )`,
    })
    .from(sales)
    .innerJoin(users, eq(sales.cashierId, users.id))
    .where(and(
      eq(sales.tenantId, tenantId),
      eq(sales.status, "completed"),
      gte(sales.createdAt, startDate),
      lt(sales.createdAt, endDate),
    ))
    .orderBy(desc(sales.createdAt))
    .limit(200);

  // Totaux globaux
  const totalRevenue = rows.reduce((s, r) => s + Number(r.totalAmount), 0);
  const totalProfit  = rows.reduce((s, r) => s + Number(r.profit), 0);

  return {
    success: true as const,
    data: {
      invoices: rows.map((r) => ({
        id:            r.id,
        invoiceNumber: r.invoiceNumber,
        status:        r.status,
        totalAmount:   Number(r.totalAmount),
        amountReceived: Number(r.amountReceived),
        changeGiven:   Number(r.changeGiven),
        profit:        Number(r.profit),
        cashierName:   `${r.cashierFirst} ${r.cashierLast}`,
        createdAt:     r.createdAt?.toISOString() ?? "",
        isGrouped:     !!r.groupInvoiceId,
      })),
      totalRevenue,
      totalProfit,
      count: rows.length,
    },
  };
}

// ─── Détail d'une facture ─────────────────────────────────────────────────────

export async function getInvoiceDetailAction(saleId: string) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;

  const [sale] = await db
    .select({
      id:            sales.id,
      invoiceNumber: sales.invoiceNumber,
      status:        sales.status,
      totalAmount:   sales.totalAmount,
      amountReceived: sales.amountReceived,
      changeGiven:   sales.changeGiven,
      createdAt:     sales.createdAt,
      cashierFirst:  users.firstName,
      cashierLast:   users.lastName,
      tenantName:    tenants.name,
      tenantLogo:    tenants.logoUrl,
      tenantPhone:   tenants.phone,
      tenantAddress: tenants.address,
      tenantSlogan:  tenants.slogan,
    })
    .from(sales)
    .innerJoin(users,   eq(sales.cashierId, users.id))
    .innerJoin(tenants, eq(sales.tenantId, tenants.id))
    .where(and(eq(sales.id, saleId), eq(sales.tenantId, tenantId)))
    .limit(1);

  if (!sale) return { success: false as const, error: "Facture introuvable" };

  const items = await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, saleId));

  return {
    success: true as const,
    data: {
      ...sale,
      totalAmount:   Number(sale.totalAmount),
      amountReceived: Number(sale.amountReceived),
      changeGiven:   Number(sale.changeGiven),
      cashierName:   `${sale.cashierFirst} ${sale.cashierLast}`,
      createdAt:     sale.createdAt?.toISOString() ?? "",
      items: items.map((i) => ({
        id:           i.id,
        productName:  i.productName,
        variantLabel: i.variantLabel,
        qty:          i.qty,
        unitPrice:    Number(i.unitPrice),
        totalLine:    Number(i.totalLine),
      })),
    },
  };
}

// ─── Factures groupées ────────────────────────────────────────────────────────

export async function getGroupInvoicesAction(period: InvoicePeriod = "month") {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;

  const now = new Date();
  const startDate = period === "today"
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const rows = await db
    .select()
    .from(groupInvoices)
    .where(and(
      eq(groupInvoices.tenantId, tenantId),
      gte(groupInvoices.createdAt, startDate),
    ))
    .orderBy(desc(groupInvoices.createdAt));

  return {
    success: true as const,
    data: rows.map((r) => ({
      id:                r.id,
      invoiceDate:       r.invoiceDate,
      status:            r.status,
      totalTransactions: r.totalTransactions,
      totalAmount:       Number(r.totalAmount),
      closedAt:          r.closedAt?.toISOString() ?? null,
      createdAt:         r.createdAt?.toISOString() ?? "",
    })),
  };
}