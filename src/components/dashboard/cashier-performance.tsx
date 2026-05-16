// Composant affichant la performance des caissières du mois, avec barre de progression relative au meilleur chiffre d'affaires et indicateurs de ventes et date d'embauche
import { Users, TrendingUp } from "lucide-react";
import { formatMoney, formatNumber, formatDate } from "@/lib/utils/formatters";
import type { CashierPerf } from "@/actions/dashboard/get-stats.action";

interface CashierPerformanceProps {
  data:    CashierPerf[];
  loading: boolean;
}

export function CashierPerformance({ data, loading }: CashierPerformanceProps) {
  const maxRevenue = Math.max(...data.map((c) => c.revenue), 1);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Performance Caissières</h3>
          <p className="text-xs text-slate-400 mt-0.5">Ce mois-ci</p>
        </div>
        <Users className="w-4 h-4 text-slate-500" />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-slate-700 rounded animate-pulse w-1/2" />
              <div className="h-2 bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="py-6 text-center text-slate-500 text-sm">
          Aucune caissière enregistrée
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((cashier, index) => {
            const initials = cashier.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            const pct = maxRevenue > 0 ? (cashier.revenue / maxRevenue) * 100 : 0;
            const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500"];
            const color  = colors[index % colors.length];

            return (
              <div key={cashier.cashierId}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-white truncate">{cashier.name}</p>
                      <span className="text-xs font-semibold text-slate-300 flex-shrink-0 ml-2">
                        {formatMoney(cashier.revenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-slate-500">
                        {formatNumber(cashier.salesCount)} ventes
                      </p>
                      <p className="text-xs text-slate-500">
                        Depuis {formatDate(cashier.hiredAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden ml-11">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.length > 0 && (
        <a
          href="/personnel"
          className="mt-5 flex items-center justify-center w-full py-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Voir tout le personnel →
        </a>
      )}
    </div>
  );
}