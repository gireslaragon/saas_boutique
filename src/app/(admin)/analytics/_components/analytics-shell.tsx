"use client";

import {
  RevenueByDayChart,
  SalesByHourChart,
  RevenueByCategoryChart,
  TopProductsBar,
} from "./analytics-charts";

interface AnalyticsShellProps {
  byDay:       { date: string; revenue: number; profit: number; sales: number }[];
  byHour:      { hour: number; count: number; revenue: number }[];
  byCategory:  { name: string; revenue: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
}

export function AnalyticsShell({ byDay, byHour, byCategory, topProducts }: AnalyticsShellProps) {
  return (
    <div className="space-y-5">
      {/* Courbe 30j — pleine largeur */}
      <RevenueByDayChart data={byDay} />

      {/* 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SalesByHourChart data={byHour} />
        <RevenueByCategoryChart data={byCategory} />
      </div>

      {/* Top produits */}
      <TopProductsBar data={topProducts} />
    </div>
  );
}