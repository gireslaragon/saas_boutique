// Composant de graphique de revenus et bénéfices sur les 30 derniers jours, utilisant Recharts pour l'affichage
"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

import type {
    Payload,
} from "recharts/types/component/DefaultTooltipContent";

import { formatMoney, formatDateShort } from "@/lib/utils/formatters";
import type { DailyStat } from "@/actions/dashboard/get-stats.action";

interface RevenueChartProps {
    data: DailyStat[];
    loading: boolean;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Payload<number, string>[];
    label?: string;
}

function CustomTooltip({
    active,
    payload,
    label,
}: CustomTooltipProps) {
    if (!active || !payload?.length) return null;

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
            <p className="text-slate-400 mb-2">{label}</p>

            {payload.map((p) => (
                <div
                    key={String(p.name)}
                    className="flex items-center gap-2 mb-1"
                >
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: p.color }}
                    />

                    <span className="text-slate-300">
                        {p.name}:
                    </span>

                    <span className="font-semibold text-white">
                        {formatMoney(Number(p.value))}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function RevenueChart({
    data,
    loading,
}: RevenueChartProps) {
    const formatted = data.map((d) => ({
        ...d,
        dateLabel: formatDateShort(d.date),
        revenue: Math.round(d.revenue),
        profit: Math.round(d.profit),
    }));

    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-semibold text-white">Ventes & Bénéfices</h3>
                    <p className="text-xs text-slate-400 mt-0.5">30 derniers jours</p>
                </div>
            </div>

            {loading ? (
                <div className="h-64 bg-slate-700/30 rounded-xl animate-pulse" />
            ) : data.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                    Aucune vente sur cette période
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={formatted} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                            dataKey="dateLabel"
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            width={40}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: "12px", color: "#94a3b8", paddingTop: "16px" }}
                        />

                        <Area
                            type="monotone"
                            dataKey="revenue"
                            name="Chiffre d'affaires"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="url(#colorRevenue)"
                            dot={false}
                            activeDot={{ r: 4, fill: "#3b82f6" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="profit"
                            name="Bénéfice"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#colorProfit)"
                            dot={false}
                            activeDot={{ r: 4, fill: "#10b981" }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}