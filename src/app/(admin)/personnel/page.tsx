import type { Metadata } from "next";
import { Users, TrendingUp, UserX } from "lucide-react";
import { getCashiersAction } from "@/actions/personnel/personnel.action";
import { formatMoney } from "@/lib/utils/formatters";
import { PersonnelShell } from "./_components/personnel-shell";

export const metadata: Metadata = { title: "Personnel" };
export const revalidate = 0;

export default async function PersonnelPage() {
  const res      = await getCashiersAction();
  const cashiers = res.success ? res.data : [];

  const active       = cashiers.filter((c) => c.status === "active");
  const inactive     = cashiers.filter((c) => c.status !== "active");
  const totalRevenue = cashiers.reduce((s, c) => s + c.totalRevenue, 0);
  const totalSales   = cashiers.reduce((s, c) => s + c.totalSales, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Personnel</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Gérez vos caissières — accès, performances et historique
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total caissières", value: cashiers.length,          cls: "text-white",       icon: Users },
          { label: "Actives",          value: active.length,            cls: "text-emerald-400", icon: Users },
          { label: "Ventes cumulées",  value: totalSales,               cls: "text-blue-400",    icon: TrendingUp },
          { label: "CA total généré",  value: formatMoney(totalRevenue), cls: "text-white",       icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <PersonnelShell cashiers={cashiers} />
    </div>
  );
}