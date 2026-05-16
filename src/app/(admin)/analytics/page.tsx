import type { Metadata } from "next";
import { TrendingUp, TrendingDown, ShoppingCart, Wallet, Package, Truck } from "lucide-react";
import { AnalyticsShell } from "./_components/analytics-shell";
import {
  getRevenueByDayAction,
  getSalesByHourAction,
  getRevenueByCategoryAction,
  getTopProductsByRevenueAction,
  getMonthComparisonAction,
} from "@/actions/analytics/analytics.action";
import { formatMoney, formatNumber, formatVariation, formatMonth } from "@/lib/utils/formatters";

export const metadata: Metadata = { title: "Analytiques" };
export const revalidate = 300;

export default async function AnalyticsPage() {
  const [byDayRes, byHourRes, byCatRes, topRes, compRes] = await Promise.all([
    getRevenueByDayAction(),
    getSalesByHourAction(),
    getRevenueByCategoryAction(),
    getTopProductsByRevenueAction(8),
    getMonthComparisonAction(),
  ]);

  const byDay       = byDayRes.success  ? byDayRes.data  : [];
  const byHour      = byHourRes.success ? byHourRes.data : [];
  const byCategory  = byCatRes.success  ? byCatRes.data  : [];
  const topProducts = topRes.success    ? topRes.data    : [];
  const comp        = compRes.success   ? compRes.data   : null;

  const revVar   = comp ? formatVariation(comp.current.revenue,    comp.previous.revenue)    : null;
  const profVar  = comp ? formatVariation(comp.current.profit,     comp.previous.profit)     : null;
  const salesVar = comp ? formatVariation(comp.current.salesCount, comp.previous.salesCount) : null;

  // Heure de pointe
  const peakHour = byHour.reduce((best, h) => h.count > best.count ? h : best, byHour[0] ?? { hour: 0, count: 0, revenue: 0 });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Analytiques</h1>
        <p className="text-sm text-slate-400 mt-0.5">{formatMonth()} — données en temps réel</p>
      </div>

      {/* ── KPIs comparatifs M vs M-1 ───────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Ce mois vs mois précédent
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              label: "Chiffre d'affaires",
              value: formatMoney(comp?.current.revenue ?? 0),
              prev:  formatMoney(comp?.previous.revenue ?? 0),
              var:   revVar,
              icon:  TrendingUp,
              color: "text-blue-400",
              bg:    "bg-blue-600/20",
            },
            {
              label: "Bénéfice",
              value: formatMoney(comp?.current.profit ?? 0),
              prev:  formatMoney(comp?.previous.profit ?? 0),
              var:   profVar,
              icon:  Wallet,
              color: "text-emerald-400",
              bg:    "bg-emerald-600/20",
            },
            {
              label: "Ventes",
              value: formatNumber(comp?.current.salesCount ?? 0),
              prev:  formatNumber(comp?.previous.salesCount ?? 0),
              var:   salesVar,
              icon:  ShoppingCart,
              color: "text-violet-400",
              bg:    "bg-violet-600/20",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 ${kpi.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <p className="text-xs text-slate-400">{kpi.label}</p>
              </div>
              <p className="text-xl font-bold text-white mb-1">{kpi.value}</p>
              {kpi.var && !kpi.var.neutral && (
                <div className={`flex items-center gap-1 text-xs font-medium ${kpi.var.positive ? "text-emerald-400" : "text-red-400"}`}>
                  {kpi.var.positive
                    ? <TrendingUp className="w-3 h-3" />
                    : <TrendingDown className="w-3 h-3" />
                  }
                  <span>{kpi.var.value} · Préc: {kpi.prev}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Infos supplémentaires ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Heure de pointe</p>
          <p className="text-xl font-bold text-white">
            {String(peakHour.hour).padStart(2, "0")}h
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{formatNumber(peakHour.count)} ventes</p>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Ticket moyen</p>
          <p className="text-xl font-bold text-white">
            {comp && comp.current.salesCount > 0
              ? formatMoney(comp.current.revenue / comp.current.salesCount)
              : "—"
            }
          </p>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-3.5 h-3.5 text-red-400" />
            <p className="text-xs text-slate-400">Pertes déclarées</p>
          </div>
          <p className="text-xl font-bold text-red-400">
            {formatMoney(comp?.lossTotal ?? 0)}
          </p>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-xs text-slate-400">Réapprovisionnements</p>
          </div>
          <p className="text-xl font-bold text-emerald-400">
            {formatMoney(comp?.restockTotal ?? 0)}
          </p>
        </div>
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <AnalyticsShell
        byDay={byDay}
        byHour={byHour}
        byCategory={byCategory}
        topProducts={topProducts}
      />
    </div>
  );
}