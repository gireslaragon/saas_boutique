import type { Metadata } from "next";
import { FileText, TrendingUp, ShoppingCart, Wallet } from "lucide-react";
import { InvoicesShell } from "./_components/invoices-shell";
import { getInvoicesAction } from "@/actions/invoices/invoices.action";
import { formatMoney, formatNumber, formatMonth } from "@/lib/utils/formatters";

export const metadata: Metadata = { title: "Factures" };
export const revalidate = 0;

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params  = await searchParams;
  const period  = (params.period as "today" | "month") ?? "month";

  const res     = await getInvoicesAction(period);
  const data    = res.success ? res.data : { invoices: [], totalRevenue: 0, totalProfit: 0, count: 0 };

  const avgTicket = data.count > 0 ? data.totalRevenue / data.count : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Factures</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {period === "today" ? "Aujourd'hui" : formatMonth()}
          </p>
        </div>

        {/* Sélecteur période */}
        <div className="flex gap-2">
          {[
            { key: "today", label: "Aujourd'hui" },
            { key: "month", label: "Ce mois" },
          ].map(({ key, label }) => (
            <a
              key={key}
              href={`/factures?period=${key}`}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                period === key
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                  : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Factures",      value: formatNumber(data.count),          icon: FileText,     cls: "text-white",       bg: "bg-blue-600/20",    ic: "text-blue-400" },
          { label: "CA total",       value: formatMoney(data.totalRevenue),    icon: TrendingUp,   cls: "text-white",       bg: "bg-emerald-600/20", ic: "text-emerald-400" },
          { label: "Bénéfice",       value: formatMoney(data.totalProfit),     icon: Wallet,       cls: "text-emerald-400", bg: "bg-emerald-600/20", ic: "text-emerald-400" },
          { label: "Ticket moyen",   value: formatMoney(avgTicket),            icon: ShoppingCart, cls: "text-white",       bg: "bg-violet-600/20",  ic: "text-violet-400" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-4 h-4 ${s.ic}`} />
            </div>
            <div>
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className={`text-sm font-bold ${s.cls}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <InvoicesShell
        invoices={data.invoices}
        totalRevenue={data.totalRevenue}
        totalProfit={data.totalProfit}
        count={data.count}
        period={period}
      />
    </div>
  );
}