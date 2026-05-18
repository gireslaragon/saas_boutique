import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/role-guards";
import { db } from "@/db";
import { restockings } from "@/db/schema/restockings";
import { productVariants } from "@/db/schema/product-variants";
import { products } from "@/db/schema/products";
import { users } from "@/db/schema/users";
import { eq, and, desc } from "drizzle-orm";
import { formatMoney, formatNumber, formatDateTime } from "@/lib/utils/formatters";

export const metadata: Metadata = { title: "Approvisionnements" };
export const revalidate = 0;

export default async function ApprovisionnementsPage() {
  const auth = await requireAdmin();

  const rows = await db
    .select({
      id:               restockings.id,
      qtyUnitsAdded:    restockings.qtyUnitsAdded,
      costPricePerUnit: restockings.costPricePerUnit,
      totalCost:        restockings.totalCost,
      supplier:         restockings.supplier,
      notes:            restockings.notes,
      createdAt:        restockings.createdAt,
      variantLabel:     productVariants.label,
      variantType:      productVariants.variantType,
      unitsPerVariant:  productVariants.unitsPerVariant,
      productName:      products.name,
      imageUrl:         products.imageUrl,
      createdByFirst:   users.firstName,
      createdByLast:    users.lastName,
    })
    .from(restockings)
    .innerJoin(productVariants, eq(restockings.variantId,  productVariants.id))
    .innerJoin(products,        eq(productVariants.productId, products.id))
    .innerJoin(users,           eq(restockings.createdBy,  users.id))
    .where(eq(restockings.tenantId, auth.tenantId))
    .orderBy(desc(restockings.createdAt))
    .limit(200);

  const totalInvested = rows.reduce((s, r) => s + Number(r.totalCost), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Approvisionnements</h1>
          <p className="text-sm text-slate-400 mt-0.5">Historique de toutes les entrées de stock</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Total investi</p>
          <p className="text-lg font-bold text-white">{formatMoney(totalInvested)}</p>
        </div>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
          {["Produit", "Quantité ajoutée", "Paquet / Casier", "Prix achat", "Coût total", "Date"].map((h) => (
            <p key={h} className="text-xs font-semibold text-slate-400">{h}</p>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <Truck className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Aucun approvisionnement enregistré</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3.5 items-center hover:bg-slate-700/20 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex-shrink-0 overflow-hidden">
                    {r.imageUrl
                      ? <img src={r.imageUrl} alt={r.productName} className="w-full h-full object-cover" />
                      : <span className="flex items-center justify-center h-full text-xs text-slate-500">?</span>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.productName}</p>
                    <p className="text-xs text-slate-400">{r.variantLabel} · {r.supplier ?? "—"}</p>
                  </div>
                </div>
                <p className="text-sm text-emerald-400 font-medium">+{formatNumber(r.qtyUnitsAdded)} u</p>
                <p className="text-sm text-slate-300">
                  {r.unitsPerVariant && Number(r.unitsPerVariant) > 1 ? (
                    (() => {
                      const packs = Number(r.qtyUnitsAdded) / Number(r.unitsPerVariant);
                      const label = r.variantType === "pack" ? "paquet(s)" : r.variantType === "case" ? "casier(s)" : ""
                      return `${formatNumber(Number(packs.toFixed(2)))} ${label}`;
                    })()
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-sm text-slate-300">{formatMoney(Number(r.costPricePerUnit))}</p>
                <p className="text-sm text-white font-medium">{formatMoney(Number(r.totalCost))}</p>
                <div>
                  <p className="text-xs text-slate-300">{formatDateTime(r.createdAt!)}</p>
                  <p className="text-xs text-slate-500">{r.createdByFirst} {r.createdByLast}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}