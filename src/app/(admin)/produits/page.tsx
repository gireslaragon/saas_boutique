import type { Metadata } from "next";
import { ProductsShell } from "./_components/products-shell";
import { getProductsAction, getCategoriesAction } from "@/actions/products/get-products.action";

export const metadata: Metadata = { title: "Produits" };
export const revalidate = 0;

export default async function ProduitsPage() {
  const [productsRes, categoriesRes] = await Promise.all([
    getProductsAction(),
    getCategoriesAction(),
  ]);

  const products   = productsRes.success   ? productsRes.data   : [];
  const categories = categoriesRes.success ? categoriesRes.data : [];

  const total      = products.length;
  const actifs     = products.filter((p) => p.isActive).length;
  const lowStock   = products.filter((p) => p.variants.some((v) => v.isLowStock)).length;
  const outOfStock = products.filter((p) => p.variants.some((v) => v.isOutOfStock)).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Produits</h1>
        <p className="text-sm text-slate-400 mt-0.5">Gérez votre catalogue et les variantes de vente</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total",        value: total,      cls: "text-white",       border: "border-slate-700/40" },
          { label: "Actifs",       value: actifs,     cls: "text-emerald-400", border: "border-emerald-500/20" },
          { label: "Stock faible", value: lowStock,   cls: "text-amber-400",   border: "border-amber-500/20" },
          { label: "Rupture",      value: outOfStock, cls: "text-red-400",     border: "border-red-500/20" },
        ].map((s) => (
          <div key={s.label} className={`bg-slate-800/40 border ${s.border} rounded-xl p-4`}>
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <ProductsShell initialProducts={products} categories={categories} />
    </div>
  );
}