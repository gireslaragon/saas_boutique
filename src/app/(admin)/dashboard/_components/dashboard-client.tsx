"use client";

import { useState } from "react";
import { BarChart3, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { RevenueChart }       from "@/components/dashboard/revenue-chart";
import { TopProducts }        from "@/components/dashboard/top-products";
import { LowStockAlerts }     from "@/components/dashboard/low-stock-alert";
import { CashierPerformance } from "@/components/dashboard/cashier-performance";
import { StatCard }           from "@/components/dashboard/stat-card";
import type {
  DashboardStats,
  DailyStat,
  TopProduct,
  LowStockAlert,
  CashierPerf,
} from "@/actions/dashboard/get-stats.action";

interface DashboardClientProps {
  dailyStats:  DailyStat[];
  topProducts: TopProduct[];
  lowStock:    LowStockAlert[];
  cashiers:    CashierPerf[];
  stats?:      DashboardStats | null;
}

export function DashboardClient({
  dailyStats,
  topProducts,
  lowStock,
  cashiers,
  stats,
}: DashboardClientProps) {
  return (
    <>
      {/* KPIs — grille 4 colonnes */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Revenus (aujourd'hui)"
          value={stats?.today?.revenue ? `${(stats.today.revenue / 1000).toFixed(1)}k` : "—"}
          icon={TrendingUp}
          iconColor="bg-blue-600"
          current={stats?.today?.revenue}
          previous={stats?.prevMonth?.revenue}
          loading={!stats}
        />
        <StatCard
          title="Nombre de ventes"
          value={stats?.month?.salesCount?.toString() ?? "—"}
          icon={ShoppingCart}
          iconColor="bg-emerald-600"
          current={stats?.month?.salesCount}
          previous={stats?.prevMonth?.salesCount}
          loading={!stats}
        />
        <StatCard
          title="Stock critique"
          value={`${stats?.lowStockCount ?? 0}`}
          subtitle={`${stats?.outOfStockCount ?? 0} ruptures`}
          icon={BarChart3}
          iconColor="bg-red-600"
          loading={!stats}
        />
        <StatCard
          title="Caissières actives"
          value={stats?.activeCashiersCount?.toString() ?? "—"}
          icon={Users}
          iconColor="bg-orange-600"
          loading={!stats}
        />
      </div> */}

      {/* Graphique ventes — pleine largeur */}
      <div className="mb-6">
        <RevenueChart data={dailyStats} loading={false} />
      </div>

      {/* Grille 3 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top produits — 2 cols */}
        <div className="lg:col-span-2">
          <TopProducts data={topProducts} loading={false} />
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          <LowStockAlerts   data={lowStock}  loading={false} />
          <CashierPerformance data={cashiers} loading={false} />
        </div>
      </div>
    </>
  );
}