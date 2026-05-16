// Carte KPI réutilisable pour le dashboard, avec indicateur de variation par rapport au mois précédent
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatVariation } from "@/lib/utils/formatters";

interface StatCardProps {
  title:      string;
  value:      string;
  subtitle?:  string;
  icon:       LucideIcon;
  iconColor?: string;
  current?:   number;
  previous?:  number;
  loading?:   boolean;
}

export function StatCard({
  title, value, subtitle, icon: Icon,
  iconColor = "bg-blue-600",
  current, previous, loading,
}: StatCardProps) {

  const variation = (current !== undefined && previous !== undefined)
    ? formatVariation(current, previous)
    : null;

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
        </div>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconColor)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-32 bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-20 bg-slate-700 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-white tracking-tight">{value}</p>

          {/* Variation mois précédent */}
          {variation && !variation.neutral && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              variation.positive ? "text-emerald-400" : "text-red-400"
            )}>
              {variation.positive
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              <span>{variation.value} vs mois précédent</span>
            </div>
          )}
          {variation?.neutral && (
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
              <Minus className="w-3 h-3" />
              <span>Pas de données précédentes</span>
            </div>
          )}

          {subtitle && !variation && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </>
      )}
    </div>
  );
}