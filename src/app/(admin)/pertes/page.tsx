import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/lib/auth/role-guards";
import { db } from "@/db";
import { stockLosses } from "@/db/schema/stock-losses";
import { productVariants } from "@/db/schema/product-variants";
import { products } from "@/db/schema/products";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";
import { formatMoney, formatNumber, formatDateTime } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Pertes de stock" };
export const revalidate = 0;

const LOSS_LABELS: Record<string, { label: string; color: string }> = {
  breakage: { label: "Casse",             color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  theft:    { label: "Vol",               color: "bg-red-500/20 text-red-300 border-red-500/30" },
  expiry:   { label: "Péremption",        color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  error:    { label: "Erreur comptage",   color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  other:    { label: "Autre",             color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
};

export default async function PertesPage() {
  const auth = await requireAdmin();

  const rows = await db
    .select({
      id:             stockLosses.id,
      lossType:       stockLosses.lossType,
      qtyUnitsLost:   stockLosses.qtyUnitsLost,
      estimatedValue: stockLosses.estimatedValue,
      reason:         stockLosses.reason,
      declaredAt:     stockLosses.declaredAt,
      variantLabel:   productVariants.label,
      productName:    products.name,
      imageUrl:       products.imageUrl,
      declaredByFirst: users.firstName,
      declaredByLast:  users.lastName,
    })
    .from(stockLosses)
    .innerJoin(productVariants, eq(stockLosses.variantId,   productVariants.id))
    .innerJoin(products,        eq(productVariants.productId, products.id))
    .innerJoin(users,           eq(stockLosses.declaredBy,  users.id))
    .where(eq(stockLosses.tenantId, auth.tenantId))
    .orderBy(desc(stockLosses.declaredAt))
    .limit(200);

  const totalLost = rows.reduce((s, r) => s + Number(r.estimatedValue ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pertes de stock</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Historique des casses, vols et péremptions
          </p>
        </div>
        {totalLost > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-400">Valeur perdue estimée</p>
            <p className="text-lg font-bold text-red-400">{formatMoney(totalLost)}</p>
          </div>
        )}
      </div>

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
          {["Produit", "Type", "Quantité", "Motif", "Date"].map((h) => (
            <p key={h} className="text-xs font-semibold text-slate-400">{h}</p>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Aucune perte déclarée</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {rows.map((r) => {
              const lossInfo = LOSS_LABELS[r.lossType] ?? LOSS_LABELS.other;
              return (
                <div key={r.id} className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4 px-4 py-3.5 items-center hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex-shrink-0 overflow-hidden">
                      {r.imageUrl
                        ? <img src={r.imageUrl} alt={r.productName} className="w-full h-full object-cover" />
                        : <span className="flex items-center justify-center h-full text-xs text-slate-500">?</span>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.productName}</p>
                      <p className="text-xs text-slate-400">{r.variantLabel}</p>
                    </div>
                  </div>

                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border w-fit", lossInfo.color)}>
                    {lossInfo.label}
                  </span>

                  <div>
                    <p className="text-sm font-medium text-red-400">-{formatNumber(r.qtyUnitsLost)} u</p>
                    {r.estimatedValue && Number(r.estimatedValue) > 0 && (
                      <p className="text-xs text-slate-500">{formatMoney(Number(r.estimatedValue))}</p>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 truncate">{r.reason}</p>

                  <div>
                    <p className="text-xs text-slate-300">{formatDateTime(r.declaredAt!)}</p>
                    <p className="text-xs text-slate-500">{r.declaredByFirst} {r.declaredByLast}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}