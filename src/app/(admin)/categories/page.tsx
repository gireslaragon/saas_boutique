import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/role-guards";
import { db } from "@/db";
import { categories } from "@/db/schema/categories";
import { products } from "@/db/schema/products";
import { eq, and, sql } from "drizzle-orm";
import { CategoriesShell } from "./_components/categories-shell";

export const metadata: Metadata = { title: "Catégories" };
export const revalidate = 0;

export default async function CategoriesPage() {
  const auth = await requireAdmin();

  // Catégories avec comptage de produits
  const rows = await db
    .select({
      id:        categories.id,
      name:      categories.name,
      color:     categories.color,
      isDefault: categories.isDefault,
      sortOrder: categories.sortOrder,
      _count: sql<number>`(
        select count(*) from products p
        where p.category_id = ${categories.id}
        and p.is_active = true
      )`,
    })
    .from(categories)
    .where(eq(categories.tenantId, auth.tenantId))
    .orderBy(categories.sortOrder, categories.name);

  const defaultCount = rows.filter((r) => r.isDefault).length;
  const customCount  = rows.filter((r) => !r.isDefault).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Catégories</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Organisez vos produits par catégories
          </p>
        </div>

        <div className="flex gap-3">
          <div className="px-3 py-2 bg-slate-800/50 border border-slate-700/40 rounded-xl text-center">
            <p className="text-xs text-slate-400">Par défaut</p>
            <p className="text-lg font-bold text-slate-300">{defaultCount}</p>
          </div>
          <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
            <p className="text-xs text-blue-400">Personnalisées</p>
            <p className="text-lg font-bold text-white">{customCount}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl">
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Épicerie générale</span>,{" "}
          <span className="font-semibold text-slate-300">Mini-bar</span> et{" "}
          <span className="font-semibold text-slate-300">Boulangerie</span> sont
          les catégories par défaut — elles ne peuvent pas être supprimées. Les catégories
          apparaissent comme filtres dans l&apos;interface caissière.
        </p>
      </div>

      <CategoriesShell categories={rows.map(r => ({ ...r, _count: Number(r._count) }))} />
    </div>
  );
}