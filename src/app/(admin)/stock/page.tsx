import type { Metadata } from "next";
import { Warehouse, TrendingDown, AlertTriangle, XCircle } from "lucide-react";
import { StockShell } from "./_components/stock-shell";
import { getStockAction } from "@/actions/stock/stock.action";
import { formatMoney } from "@/lib/utils/formatters";

export const metadata: Metadata = { title: "Stock" };
export const revalidate = 0;

export default async function StockPage() {
  const res  = await getStockAction();
  const data = res.success ? res.data : [];

  const outOfStock = data.filter((r) => r.isOutOfStock).length;
  const lowStock   = data.filter((r) => r.isLowStock).length;
  const okStock    = data.filter((r) => !r.isLowStock && !r.isOutOfStock).length;
  const totalValue = data.reduce((s, r) => s + r.sellingPrice * r.qtyUnits, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Stock</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Suivez les niveaux de stock et gérez les mouvements
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Warehouse className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Variantes</p>
            <p className="text-xl font-bold text-white">{data.length}</p>
          </div>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Ruptures</p>
            <p className="text-xl font-bold text-red-400">{outOfStock}</p>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Stock faible</p>
            <p className="text-xl font-bold text-amber-400">{lowStock}</p>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Valeur estimée</p>
            <p className="text-sm font-bold text-white">{formatMoney(totalValue)}</p>
          </div>
        </div>
      </div>

      <StockShell data={data} />
    </div>
  );
}