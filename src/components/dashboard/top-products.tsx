// Composant affichant les produits les plus vendus du mois, avec barre de progression et indicateur de revenus
import { Package, TrendingUp } from "lucide-react";
import { formatMoney, formatNumber } from "@/lib/utils/formatters";
import type { TopProduct } from "@/actions/dashboard/get-stats.action";

interface TopProductsProps {
  data:    TopProduct[];
  loading: boolean;
}

export function TopProducts({ data, loading }: TopProductsProps) {
  const maxQty = Math.max(...data.map((p) => p.totalQty), 1);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Top Produits</h3>
          <p className="text-xs text-slate-400 mt-0.5">Ce mois-ci — par quantité vendue</p>
        </div>
        <TrendingUp className="w-4 h-4 text-slate-500" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-700 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-slate-700 rounded animate-pulse w-3/4" />
                <div className="h-2 bg-slate-700 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Aucune vente ce mois
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((product, index) => (
            <div key={product.productId} className="flex items-center gap-3 group">
              {/* Rang */}
              <span className="text-xs font-bold text-slate-600 w-4 text-center flex-shrink-0">
                {index + 1}
              </span>

              {/* Image */}
              <div className="w-9 h-9 rounded-lg bg-slate-700 flex-shrink-0 overflow-hidden">
                {product.imageUrl
                  ? <img src={product.imageUrl} alt={product.productName} className="w-full h-full object-cover" />
                  : <Package className="w-4 h-4 text-slate-500 m-auto mt-2.5" />
                }
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-white truncate">{product.productName}</p>
                  <span className="text-xs font-semibold text-slate-300 flex-shrink-0 ml-2">
                    {formatNumber(product.totalQty)} vendus
                  </span>
                </div>
                {/* Barre de progression */}
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(product.totalQty / maxQty) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-500">{product.variantLabel}</span>
                  <span className="text-xs text-emerald-400 font-medium">
                    {formatMoney(product.totalRevenue)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}