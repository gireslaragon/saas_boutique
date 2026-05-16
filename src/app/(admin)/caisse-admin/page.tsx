import type { Metadata } from "next";
import { ShoppingCart, CheckCircle2, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { requireAdmin } from "@/lib/auth/role-guards";
import { db } from "@/db";
import { cashSessions } from "@/db/schema/cash-sessions";
import { users } from "@/db/schema/users";
import { eq, and, desc, gte } from "drizzle-orm";
import { formatMoney, formatDateTime, formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Sessions de caisse" };
export const revalidate = 0;

export default async function CaisseAdminPage() {
  const auth = await requireAdmin();

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const sessions = await db
    .select({
      id:               cashSessions.id,
      status:           cashSessions.status,
      openedAt:         cashSessions.openedAt,
      closedAt:         cashSessions.closedAt,
      openingAmount:    cashSessions.openingAmount,
      actualAmount:     cashSessions.actualAmount,
      expectedAmount:   cashSessions.expectedAmount,
      difference:       cashSessions.difference,
      totalSalesAmount: cashSessions.totalSalesAmount,
      totalRefunds:     cashSessions.totalRefundsAmount,
      notes:            cashSessions.notes,
      cashierFirst:     users.firstName,
      cashierLast:      users.lastName,
    })
    .from(cashSessions)
    .innerJoin(users, eq(cashSessions.cashierId, users.id))
    .where(and(
      eq(cashSessions.tenantId, auth.tenantId),
      gte(cashSessions.openedAt, since),
    ))
    .orderBy(desc(cashSessions.openedAt))
    .limit(100);

  // KPIs globaux
  const closed       = sessions.filter((s) => s.status === "closed");
  const totalSales   = closed.reduce((sum, s) => sum + Number(s.totalSalesAmount ?? 0), 0);
  const totalDiff    = closed.reduce((sum, s) => sum + Number(s.difference ?? 0), 0);
  const sessionsWithEcart = closed.filter((s) => Math.abs(Number(s.difference ?? 0)) > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Sessions de caisse</h1>
        <p className="text-sm text-slate-400 mt-0.5">30 derniers jours — ouvertures et fermetures</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Sessions clôturées", value: closed.length,                icon: CheckCircle2, cls: "text-white",       bg: "bg-slate-700/60",    ic: "text-slate-400" },
          { label: "CA encaissé total",  value: formatMoney(totalSales),      icon: TrendingUp,   cls: "text-emerald-400", bg: "bg-emerald-600/20",  ic: "text-emerald-400" },
          { label: "Écarts détectés",    value: sessionsWithEcart.length,     icon: AlertTriangle,cls: sessionsWithEcart.length > 0 ? "text-amber-400" : "text-white", bg: "bg-amber-600/20", ic: "text-amber-400" },
          { label: "Différence totale",  value: formatMoney(Math.abs(totalDiff)), icon: totalDiff < 0 ? AlertTriangle : CheckCircle2, cls: totalDiff < 0 ? "text-red-400" : "text-emerald-400", bg: totalDiff < 0 ? "bg-red-600/20" : "bg-emerald-600/20", ic: totalDiff < 0 ? "text-red-400" : "text-emerald-400" },
        ].map((k) => (
          <div key={k.label} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <k.icon className={`w-4 h-4 ${k.ic}`} />
            </div>
            <div>
              <p className="text-xs text-slate-400">{k.label}</p>
              <p className={`text-lg font-bold ${k.cls}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table des sessions */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
          {["Caissière / Ouverture", "Fermeture", "CA encaissé", "Attendu", "Réel", "Écart"].map((h) => (
            <p key={h} className="text-xs font-semibold text-slate-400">{h}</p>
          ))}
        </div>

        {sessions.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Aucune session sur cette période</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {sessions.map((s) => {
              const diff      = Number(s.difference ?? 0);
              const isOpen    = s.status === "open";
              const hasEcart  = Math.abs(diff) > 0;

              return (
                <div
                  key={s.id}
                  className={cn(
                    "grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3.5 items-center hover:bg-slate-700/20 transition-colors",
                    hasEcart && diff < 0 && "border-l-2 border-red-500/40",
                    hasEcart && diff > 0 && "border-l-2 border-emerald-500/30",
                  )}
                >
                  {/* Caissière + heure ouverture */}
                  <div>
                    <p className="text-sm font-medium text-white">{s.cashierFirst} {s.cashierLast}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(s.openedAt!)}</p>
                    {isOpen && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-400 mt-0.5">
                        <Clock className="w-3 h-3" /> En cours
                      </span>
                    )}
                  </div>

                  {/* Fermeture */}
                  <p className="text-xs text-slate-400">
                    {s.closedAt ? formatDateTime(s.closedAt) : "—"}
                  </p>

                  {/* CA encaissé */}
                  <p className="text-sm font-medium text-white">
                    {formatMoney(Number(s.totalSalesAmount ?? 0))}
                  </p>

                  {/* Montant attendu */}
                  <p className="text-sm text-slate-300">
                    {s.expectedAmount ? formatMoney(Number(s.expectedAmount)) : "—"}
                  </p>

                  {/* Montant réel */}
                  <p className="text-sm text-slate-300">
                    {s.actualAmount ? formatMoney(Number(s.actualAmount)) : "—"}
                  </p>

                  {/* Écart */}
                  {isOpen ? (
                    <span className="text-xs text-slate-500">Session ouverte</span>
                  ) : s.difference === null ? (
                    <span className="text-xs text-slate-500">—</span>
                  ) : (
                    <div>
                      <span className={cn(
                        "text-sm font-bold",
                        diff === 0 ? "text-emerald-400"
                        : diff > 0  ? "text-blue-400"
                        : "text-red-400"
                      )}>
                        {diff > 0 ? "+" : ""}{formatMoney(diff)}
                      </span>
                      {diff !== 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {diff > 0 ? "Surplus" : "Manque"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}