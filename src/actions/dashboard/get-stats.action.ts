"use server";

import { db } from "@/db";
import { sales } from "@/db/schema/sales";
import { saleItems } from "@/db/schema/sale-items";
import { stockSnapshots } from "@/db/schema/stock-snapshots";
import { productVariants } from "@/db/schema/product-variants";
import { products } from "@/db/schema/products";
import { users } from "@/db/schema/users";
import { guardAdminAction } from "@/lib/auth/role-guards";
import { eq, and, gte, lt, sql, sum, count, desc } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  today: {
    revenue:      number;
    profit:       number;
    salesCount:   number;
    changeGiven:  number;
  };
  month: {
    revenue:      number;
    profit:       number;
    salesCount:   number;
  };
  prevMonth: {
    revenue:      number;
    profit:       number;
    salesCount:   number;
  };
  lowStockCount:  number;
  outOfStockCount: number;
  activeCashiersCount: number;
}

export interface DailyStat {
  date:     string;   // "2026-05-01"
  revenue:  number;
  profit:   number;
  sales:    number;
}

export interface TopProduct {
  productId:    string;
  productName:  string;
  imageUrl:     string | null;
  variantLabel: string;
  totalQty:     number;
  totalRevenue: number;
  totalProfit:  number;
}

export interface LowStockAlert {
  variantId:    string;
  productName:  string;
  variantLabel: string;
  imageUrl:     string | null;
  qtyUnits:     number;
  threshold:    number;
  isOutOfStock: boolean;
}

export interface CashierPerf {
  cashierId:   string;
  name:        string;
  salesCount:  number;
  revenue:     number;
  hiredAt:     string;
}

// ─── Helpers dates ────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfPrevMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}
function endOfPrevMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999);
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function getDashboardStatsAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  const { tenantId } = auth.data;
  const now      = new Date();
  const todayStart   = startOfDay(now);
  const monthStart   = startOfMonth(now);
  const prevStart    = startOfPrevMonth(now);
  const prevEnd      = endOfPrevMonth(now);

  const baseCond = and(
    eq(sales.tenantId, tenantId),
    eq(sales.status, "completed")
  );

  // ── Stats du jour ──────────────────────────────────────────────────────────
  const [todayRow] = await db
    .select({
      revenue:     sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
      salesCount:  sql<number>`count(*)`,
      changeGiven: sql<number>`coalesce(sum(${sales.changeGiven}), 0)`,
    })
    .from(sales)
    .where(and(baseCond, gte(sales.createdAt, todayStart)));

  // Bénéfice jour (via sale_items)
  const [todayProfit] = await db
    .select({
      profit: sql<number>`coalesce(sum((${saleItems.unitPrice} - ${saleItems.costPriceAtSale}) * ${saleItems.qty}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(
      eq(saleItems.tenantId, tenantId),
      eq(sales.status, "completed"),
      gte(sales.createdAt, todayStart),
    ));

  // ── Stats du mois ──────────────────────────────────────────────────────────
  const [monthRow] = await db
    .select({
      revenue:    sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
      salesCount: sql<number>`count(*)`,
    })
    .from(sales)
    .where(and(baseCond, gte(sales.createdAt, monthStart)));

  const [monthProfit] = await db
    .select({
      profit: sql<number>`coalesce(sum((${saleItems.unitPrice} - ${saleItems.costPriceAtSale}) * ${saleItems.qty}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(
      eq(saleItems.tenantId, tenantId),
      eq(sales.status, "completed"),
      gte(sales.createdAt, monthStart),
    ));

  // ── Stats mois précédent ───────────────────────────────────────────────────
  const [prevRow] = await db
    .select({
      revenue:    sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
      salesCount: sql<number>`count(*)`,
    })
    .from(sales)
    .where(and(baseCond, gte(sales.createdAt, prevStart), lt(sales.createdAt, prevEnd)));

  const [prevProfit] = await db
    .select({
      profit: sql<number>`coalesce(sum((${saleItems.unitPrice} - ${saleItems.costPriceAtSale}) * ${saleItems.qty}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(
      eq(saleItems.tenantId, tenantId),
      eq(sales.status, "completed"),
      gte(sales.createdAt, prevStart),
      lt(sales.createdAt, prevEnd),
    ));

  // ── Alertes stock ──────────────────────────────────────────────────────────
  const stockAlerts = await db
    .select({
      qtyUnits:   stockSnapshots.qtyUnits,
      threshold:  productVariants.alertThresholdUnits,
    })
    .from(stockSnapshots)
    .innerJoin(productVariants, eq(stockSnapshots.variantId, productVariants.id))
    .where(eq(stockSnapshots.tenantId, tenantId));

  const lowStockCount   = stockAlerts.filter(
    (s) => s.qtyUnits <= (s.threshold ?? 0) && s.qtyUnits > 0
  ).length;
  const outOfStockCount = stockAlerts.filter((s) => s.qtyUnits === 0).length;

  // ── Caissières actives ─────────────────────────────────────────────────────
  const [cashiersRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(and(
      eq(users.tenantId, tenantId),
      eq(users.role, "cashier"),
      eq(users.status, "active"),
    ));

  const stats: DashboardStats = {
    today: {
      revenue:     Number(todayRow?.revenue     ?? 0),
      profit:      Number(todayProfit?.profit   ?? 0),
      salesCount:  Number(todayRow?.salesCount  ?? 0),
      changeGiven: Number(todayRow?.changeGiven ?? 0),
    },
    month: {
      revenue:    Number(monthRow?.revenue    ?? 0),
      profit:     Number(monthProfit?.profit  ?? 0),
      salesCount: Number(monthRow?.salesCount ?? 0),
    },
    prevMonth: {
      revenue:    Number(prevRow?.revenue    ?? 0),
      profit:     Number(prevProfit?.profit  ?? 0),
      salesCount: Number(prevRow?.salesCount ?? 0),
    },
    lowStockCount,
    outOfStockCount,
    activeCashiersCount: Number(cashiersRow?.count ?? 0),
  };

  return { success: true, data: stats };
}

// ─── Courbe des ventes sur N jours ────────────────────────────────────────────

export async function getDailyStatsAction(days = 30) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  const { tenantId } = auth.data;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date:    sql<string>`to_char(${sales.createdAt}, 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
      sales:   sql<number>`count(*)`,
      profit:  sql<number>`coalesce(sum(
        (select coalesce(sum((si.unit_price - si.cost_price_at_sale) * si.qty), 0)
         from sale_items si where si.sale_id = ${sales.id})
      ), 0)`,
    })
    .from(sales)
    .where(and(
      eq(sales.tenantId, tenantId),
      eq(sales.status, "completed"),
      gte(sales.createdAt, since),
    ))
    .groupBy(sql`to_char(${sales.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${sales.createdAt}, 'YYYY-MM-DD')`);

  return {
    success: true,
    data: rows.map((r) => ({
      date:    r.date,
      revenue: Number(r.revenue),
      profit:  Number(r.profit),
      sales:   Number(r.sales),
    })) as DailyStat[],
  };
}

// ─── Top produits ─────────────────────────────────────────────────────────────

export async function getTopProductsAction(limit = 8) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  const { tenantId } = auth.data;
  const monthStart = startOfMonth(new Date());

  const rows = await db
    .select({
      productId:    products.id,
      productName:  products.name,
      imageUrl:     products.imageUrl,
      variantLabel: productVariants.label,
      totalQty:     sql<number>`sum(${saleItems.qty})`,
      totalRevenue: sql<number>`sum(${saleItems.totalLine})`,
      totalProfit:  sql<number>`sum((${saleItems.unitPrice} - ${saleItems.costPriceAtSale}) * ${saleItems.qty})`,
    })
    .from(saleItems)
    .innerJoin(sales,           eq(saleItems.saleId,    sales.id))
    .innerJoin(productVariants, eq(saleItems.variantId, productVariants.id))
    .innerJoin(products,        eq(productVariants.productId, products.id))
    .where(and(
      eq(saleItems.tenantId, tenantId),
      eq(sales.status, "completed"),
      gte(sales.createdAt, monthStart),
    ))
    .groupBy(products.id, products.name, products.imageUrl, productVariants.label)
    .orderBy(desc(sql`sum(${saleItems.qty})`))
    .limit(limit);

  return {
    success: true,
    data: rows.map((r) => ({
      productId:    r.productId,
      productName:  r.productName,
      imageUrl:     r.imageUrl,
      variantLabel: r.variantLabel,
      totalQty:     Number(r.totalQty),
      totalRevenue: Number(r.totalRevenue),
      totalProfit:  Number(r.totalProfit),
    })) as TopProduct[],
  };
}

// ─── Alertes stock faible ─────────────────────────────────────────────────────

export async function getLowStockAlertsAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  const { tenantId } = auth.data;

  const rows = await db
    .select({
      variantId:    productVariants.id,
      productName:  products.name,
      variantLabel: productVariants.label,
      imageUrl:     products.imageUrl,
      qtyUnits:     stockSnapshots.qtyUnits,
      threshold:    productVariants.alertThresholdUnits,
    })
    .from(stockSnapshots)
    .innerJoin(productVariants, eq(stockSnapshots.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(
      eq(stockSnapshots.tenantId, tenantId),
      eq(products.isActive, true),
      sql`${stockSnapshots.qtyUnits} <= ${productVariants.alertThresholdUnits}`,
    ))
    .orderBy(stockSnapshots.qtyUnits)
    .limit(10);

  return {
    success: true,
    data: rows.map((r) => ({
      ...r,
      isOutOfStock: r.qtyUnits === 0,
    })) as LowStockAlert[],
  };
}

// ─── Performance caissières ───────────────────────────────────────────────────

export async function getCashierPerformanceAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  const { tenantId } = auth.data;
  const monthStart = startOfMonth(new Date());

  const rows = await db
    .select({
      cashierId:  users.id,
      firstName:  users.firstName,
      lastName:   users.lastName,
      hiredAt:    users.hiredAt,
      salesCount: sql<number>`count(${sales.id})`,
      revenue:    sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
    })
    .from(users)
    .leftJoin(sales, and(
      eq(sales.cashierId, users.id),
      eq(sales.status, "completed"),
      gte(sales.createdAt, monthStart),
    ))
    .where(and(
      eq(users.tenantId, tenantId),
      eq(users.role, "cashier"),
    ))
    .groupBy(users.id, users.firstName, users.lastName, users.hiredAt)
    .orderBy(desc(sql`coalesce(sum(${sales.totalAmount}), 0)`));

  return {
    success: true,
    data: rows.map((r) => ({
      cashierId:  r.cashierId,
      name:       `${r.firstName} ${r.lastName}`,
      salesCount: Number(r.salesCount),
      revenue:    Number(r.revenue),
      hiredAt:    r.hiredAt?.toISOString() ?? "",
    })) as CashierPerf[],
  };
}