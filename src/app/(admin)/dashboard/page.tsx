import {
  TrendingUp, ShoppingCart, Wallet,
  Package, AlertTriangle, Users,
} from "lucide-react";
import { StatCard }        from "@/components/dashboard/stat-card";
import { DashboardClient } from "./_components/dashboard-client";
import {
  getDashboardStatsAction,
  getDailyStatsAction,
  getTopProductsAction,
  getLowStockAlertsAction,
  getCashierPerformanceAction,
} from "@/actions/dashboard/get-stats.action";
import { formatMoney, formatNumber, formatMonth } from "@/lib/utils/formatters";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

// Revalide toutes les 5 minutes (suffisant pour un dashboard)
export const revalidate = 300;

export default async function DashboardPage() {
  // Fetch en parallèle — toutes les données en une fois
  const [statsRes, dailyRes, topRes, lowStockRes, cashiersRes] = await Promise.all([
    getDashboardStatsAction(),
    getDailyStatsAction(30),
    getTopProductsAction(8),
    getLowStockAlertsAction(),
    getCashierPerformanceAction(),
  ]);

  const stats      = statsRes.success     ? statsRes.data     : null;
  const dailyStats = dailyRes.success     ? dailyRes.data     : [];
  const topProducts = topRes.success      ? topRes.data       : [];
  const lowStock   = lowStockRes.success  ? lowStockRes.data  : [];
  const cashiers   = cashiersRes.success  ? cashiersRes.data  : [];

  const currentMonth = formatMonth();

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tableau de bord</h1>
          <p className="text-sm text-slate-400 mt-0.5">{currentMonth}</p>
        </div>

        {/* Alertes rapides */}
        {stats && (stats.outOfStockCount > 0 || stats.lowStockCount > 0) && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-300">
              {stats.outOfStockCount > 0 && `${stats.outOfStockCount} rupture${stats.outOfStockCount > 1 ? "s" : ""}`}
              {stats.outOfStockCount > 0 && stats.lowStockCount > 0 && " · "}
              {stats.lowStockCount > 0 && `${stats.lowStockCount} stock faible`}
            </span>
          </div>
        )}
      </div>

      {/* ── KPIs du jour ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Aujourd&apos;hui
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Chiffre d'affaires"
            value={formatMoney(stats?.today.revenue ?? 0)}
            icon={TrendingUp}
            iconColor="bg-blue-600"
            subtitle={`${stats?.today.salesCount ?? 0} vente${(stats?.today.salesCount ?? 0) > 1 ? "s" : ""}`}
          />
          <StatCard
            title="Bénéfice"
            value={formatMoney(stats?.today.profit ?? 0)}
            icon={Wallet}
            iconColor="bg-emerald-600"
            subtitle="Marge brute estimée"
          />
          <StatCard
            title="Ventes"
            value={formatNumber(stats?.today.salesCount ?? 0)}
            icon={ShoppingCart}
            iconColor="bg-violet-600"
            subtitle="Transactions validées"
          />
          <StatCard
            title="Monnaie rendue"
            value={formatMoney(stats?.today.changeGiven ?? 0)}
            icon={Wallet}
            iconColor="bg-slate-600"
            subtitle="Total monnaie"
          />
        </div>
      </div>

      {/* ── KPIs du mois ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Ce mois-ci
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatCard
            title="CA du mois"
            value={formatMoney(stats?.month.revenue ?? 0)}
            icon={TrendingUp}
            iconColor="bg-blue-600"
            current={stats?.month.revenue}
            previous={stats?.prevMonth.revenue}
          />
          <StatCard
            title="Bénéfice du mois"
            value={formatMoney(stats?.month.profit ?? 0)}
            icon={Wallet}
            iconColor="bg-emerald-600"
            current={stats?.month.profit}
            previous={stats?.prevMonth.profit}
          />
          <StatCard
            title="Ventes du mois"
            value={formatNumber(stats?.month.salesCount ?? 0)}
            icon={ShoppingCart}
            iconColor="bg-violet-600"
            current={stats?.month.salesCount}
            previous={stats?.prevMonth.salesCount}
          />
        </div>
      </div>

      {/* ── Stats globales ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Stock faible</p>
            <p className="text-lg font-bold text-white">{stats?.lowStockCount ?? 0}</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Ruptures</p>
            <p className="text-lg font-bold text-white">{stats?.outOfStockCount ?? 0}</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Caissières actives</p>
            <p className="text-lg font-bold text-white">{stats?.activeCashiersCount ?? 0}</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Top produits</p>
            <p className="text-lg font-bold text-white">{topProducts.length}</p>
          </div>
        </div>
      </div>

      {/* ── Charts & tableaux (Client) ────────────────────────────────────── */}
      <DashboardClient
        dailyStats={dailyStats}
        topProducts={topProducts}
        lowStock={lowStock}
        cashiers={cashiers}
        stats={stats}
      />
    </div>
  );
}