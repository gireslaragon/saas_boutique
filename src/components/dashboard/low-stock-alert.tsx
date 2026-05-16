// Composant affichant les produits en rupture ou bientôt en rupture de stock, avec badge de quantité restante et lien vers la gestion du stock
import { AlertTriangle, Package, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatters";
import type { LowStockAlert } from "@/actions/dashboard/get-stats.action";

interface LowStockAlertsProps {
  data:    LowStockAlert[];
  loading: boolean;
}

export function LowStockAlerts({ data, loading }: LowStockAlertsProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Alertes Stock</h3>
          <p className="text-xs text-slate-400 mt-0.5">Produits à réapprovisionner</p>
        </div>
        {data.length > 0 && (
          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-full border border-red-500/20">
            {data.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-700/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Package className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-sm text-slate-400">Tout le stock est OK</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((item) => (
            <div
              key={item.variantId}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                item.isOutOfStock
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-amber-500/5 border-amber-500/20"
              )}
            >
              {/* Image */}
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex-shrink-0 overflow-hidden">
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  : <Package className="w-3.5 h-3.5 text-slate-500 m-auto mt-2" />
                }
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{item.productName}</p>
                <p className="text-xs text-slate-400">{item.variantLabel}</p>
              </div>

              {/* Badge stock */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {item.isOutOfStock ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs font-bold text-red-400">Rupture</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">
                      {formatNumber(item.qtyUnits)} restants
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {data.length > 0 && (
        <a
          href="/stock"
          className="mt-4 flex items-center justify-center w-full py-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Gérer le stock →
        </a>
      )}
    </div>
  );
}