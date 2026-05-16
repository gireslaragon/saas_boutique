"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";

import { formatMoney, formatNumber } from "@/lib/utils/formatters";

type TooltipEntry = { name?: string; value?: number; color?: string };

// ── Tooltip commun ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-semibold text-white">
            {typeof p.value === "number" && p.value > 1000
              ? formatMoney(p.value)
              : formatNumber(p.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

// ── Courbe ventes par jour ─────────────────────────────────────────────────────

interface RevenueByDayProps {
  data: { date: string; revenue: number; profit: number; sales: number }[];
}

export function RevenueByDayChart({ data }: RevenueByDayProps) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-1">CA & Bénéfice — 30 jours</h3>
      <p className="text-xs text-slate-400 mb-5">Évolution quotidienne</p>
      {data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-slate-500 text-sm">Aucune donnée</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={38} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8", paddingTop: "12px" }} />
            <Line type="monotone" dataKey="revenue" name="CA" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="profit"  name="Bénéfice" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Ventes par heure ──────────────────────────────────────────────────────────

interface SalesByHourProps {
  data: { hour: number; count: number; revenue: number }[];
}

export function SalesByHourChart({ data }: SalesByHourProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: `${String(d.hour).padStart(2, "0")}h`,
  }));

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-1">Ventes par heure</h3>
      <p className="text-xs text-slate-400 mb-5">Ce mois — quand vend-on le plus ?</p>
      {data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-slate-500 text-sm">Aucune donnée</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={formatted} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Ventes" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Répartition CA par catégorie ──────────────────────────────────────────────

interface RevenueByCategProps {
  data: { name: string; revenue: number }[];
}

export function RevenueByCategoryChart({ data }: RevenueByCategProps) {
  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-1">CA par catégorie</h3>
      <p className="text-xs text-slate-400 mb-5">Ce mois</p>
      {data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-slate-500 text-sm">Aucune donnée</div>
      ) : (
        <div className="flex gap-4 items-center">
          <ResponsiveContainer width="55%" height={200}>
            <PieChart>
              <Pie data={data} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              {/** formatter typed to accept possibly undefined values */}
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Légende custom */}
          <div className="flex-1 space-y-2">
            {data.map((d, i) => {
              const pct = total > 0 ? ((d.revenue / total) * 100).toFixed(1) : "0";
              return (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{d.name}</p>
                    <p className="text-xs text-slate-500">{formatMoney(d.revenue)} · {pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Top produits barres ───────────────────────────────────────────────────────

interface TopProductsBarProps {
  data: { name: string; qty: number; revenue: number }[];
}

export function TopProductsBar({ data }: TopProductsBarProps) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-1">Top produits — CA</h3>
      <p className="text-xs text-slate-400 mb-5">Ce mois, par chiffre d&apos;affaires</p>
      {data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-slate-500 text-sm">Aucune donnée</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="revenue" name="CA" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}