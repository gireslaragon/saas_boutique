"use server";

import { db } from "@/db";
import { sales } from "@/db/schema/sales";
import { saleItems } from "@/db/schema/sale-items";
import { products } from "@/db/schema/products";
import { productVariants } from "@/db/schema/product-variants";
import { categories } from "@/db/schema/categories";
import { stockLosses } from "@/db/schema/stock-losses";
import { restockings } from "@/db/schema/restockings";
import { guardAdminAction } from "@/lib/auth/role-guards";
import { eq, and, gte, lt, desc, sql } from "drizzle-orm";

function monthBounds(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end   = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59);
  return { start, end };
}

// ── CA & bénéfice par jour (30j) ──────────────────────────────────────────────

export async function getRevenueByDayAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;

  const since = new Date();
  since.setDate(since.getDate() - 30);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date:    sql<string>`to_char(${sales.createdAt}, 'DD/MM')`,
      revenue: sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
      profit:  sql<number>`coalesce(sum(
        (select coalesce(sum((si.unit_price - si.cost_price_at_sale) * si.qty), 0)
         from sale_items si where si.sale_id = ${sales.id})
      ), 0)`,
      salesCount: sql<number>`count(*)`,
    })
    .from(sales)
    .where(and(
      eq(sales.tenantId, tenantId),
      eq(sales.status, "completed"),
      gte(sales.createdAt, since),
    ))
    .groupBy(sql`to_char(${sales.createdAt}, 'DD/MM')`, sql`date_trunc('day', ${sales.createdAt})`)
    .orderBy(sql`date_trunc('day', ${sales.createdAt})`);

  return {
    success: true as const,
    data: rows.map((r) => ({
      date:    r.date,
      revenue: Number(r.revenue),
      profit:  Number(r.profit),
      sales:   Number(r.salesCount),
    })),
  };
}

// ── Ventes par heure ──────────────────────────────────────────────────────────

export async function getSalesByHourAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;
  const { start } = monthBounds(0);

  const rows = await db
    .select({
      hour:    sql<number>`extract(hour from ${sales.createdAt})::int`,
      count:   sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
    })
    .from(sales)
    .where(and(
      eq(sales.tenantId, tenantId),
      eq(sales.status, "completed"),
      gte(sales.createdAt, start),
    ))
    .groupBy(sql`extract(hour from ${sales.createdAt})`)
    .orderBy(sql`extract(hour from ${sales.createdAt})`);

  // Complète les heures manquantes (0–23)
  const byHour = new Map(rows.map((r) => [r.hour, r]));
  const full = Array.from({ length: 24 }, (_, h) => ({
    hour:    h,
    count:   Number(byHour.get(h)?.count   ?? 0),
    revenue: Number(byHour.get(h)?.revenue ?? 0),
  }));

  return { success: true as const, data: full };
}

// ── CA par catégorie ──────────────────────────────────────────────────────────

export async function getRevenueByCategoryAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;
  const { start } = monthBounds(0);

  const rows = await db
    .select({
      name:    sql<string>`coalesce(${categories.name}, 'Sans catégorie')`,
      revenue: sql<number>`coalesce(sum(${saleItems.totalLine}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales,           eq(saleItems.saleId,        sales.id))
    .innerJoin(productVariants, eq(saleItems.variantId,     productVariants.id))
    .innerJoin(products,        eq(productVariants.productId, products.id))
    .leftJoin(categories,       eq(products.categoryId,     categories.id))
    .where(and(
      eq(saleItems.tenantId, tenantId),
      eq(sales.status, "completed"),
      gte(sales.createdAt, start),
    ))
    .groupBy(sql`coalesce(${categories.name}, 'Sans catégorie')`)
    .orderBy(desc(sql`coalesce(sum(${saleItems.totalLine}), 0)`));

  return {
    success: true as const,
    data: rows.map((r) => ({ name: r.name, revenue: Number(r.revenue) })),
  };
}

// ── Top produits (CA) ─────────────────────────────────────────────────────────

export async function getTopProductsByRevenueAction(limit = 8) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;
  const { start } = monthBounds(0);

  const rows = await db
    .select({
      name:    products.name,
      qty:     sql<number>`sum(${saleItems.qty})`,
      revenue: sql<number>`sum(${saleItems.totalLine})`,
    })
    .from(saleItems)
    .innerJoin(sales,           eq(saleItems.saleId,        sales.id))
    .innerJoin(productVariants, eq(saleItems.variantId,     productVariants.id))
    .innerJoin(products,        eq(productVariants.productId, products.id))
    .where(and(
      eq(saleItems.tenantId, tenantId),
      eq(sales.status, "completed"),
      gte(sales.createdAt, start),
    ))
    .groupBy(products.id, products.name)
    .orderBy(desc(sql`sum(${saleItems.totalLine})`))
    .limit(limit);

  return {
    success: true as const,
    data: rows.map((r) => ({
      name:    r.name,
      qty:     Number(r.qty),
      revenue: Number(r.revenue),
    })),
  };
}

// ── Comparaison M vs M-1 ──────────────────────────────────────────────────────

export async function getMonthComparisonAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;

  const curr = monthBounds(0);
  const prev = monthBounds(1);

  async function fetchMonth(start: Date, end: Date) {
    const [row] = await db
      .select({
        revenue:    sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
        salesCount: sql<number>`count(*)`,
        profit:     sql<number>`coalesce(sum(
          (select coalesce(sum((si.unit_price - si.cost_price_at_sale) * si.qty), 0)
           from sale_items si where si.sale_id = ${sales.id})
        ), 0)`,
      })
      .from(sales)
      .where(and(
        eq(sales.tenantId, tenantId),
        eq(sales.status, "completed"),
        gte(sales.createdAt, start),
        lt(sales.createdAt, end),
      ));
    return {
      revenue:    Number(row?.revenue    ?? 0),
      salesCount: Number(row?.salesCount ?? 0),
      profit:     Number(row?.profit     ?? 0),
    };
  }

  const [current, previous] = await Promise.all([
    fetchMonth(curr.start, curr.end),
    fetchMonth(prev.start, prev.end),
  ]);

  // Pertes du mois
  const [lossRow] = await db
    .select({ total: sql<number>`coalesce(sum(${stockLosses.estimatedValue}), 0)` })
    .from(stockLosses)
    .where(and(
      eq(stockLosses.tenantId, tenantId),
      gte(stockLosses.declaredAt, curr.start),
    ));

  // Coût approvisionnements du mois
  const [restockRow] = await db
    .select({ total: sql<number>`coalesce(sum(${restockings.totalCost}), 0)` })
    .from(restockings)
    .where(and(
      eq(restockings.tenantId, tenantId),
      gte(restockings.createdAt, curr.start),
    ));

  return {
    success: true as const,
    data: {
      current,
      previous,
      lossTotal:    Number(lossRow?.total    ?? 0),
      restockTotal: Number(restockRow?.total ?? 0),
    },
  };
}