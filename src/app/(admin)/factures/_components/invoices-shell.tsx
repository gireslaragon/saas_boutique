"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, FileText, Eye, Download, ChevronRight,
  X, Receipt, TrendingUp, Calendar, Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatMoney, formatDateTime, formatDate, formatNumber } from "@/lib/utils/formatters";
import { toast } from "sonner";
import { getInvoiceDetailAction } from "@/actions/invoices/invoices.action";

interface Invoice {
  id:            string;
  invoiceNumber: string | null;
  status:        string;
  totalAmount:   number;
  amountReceived: number;
  changeGiven:   number;
  profit:        number;
  cashierName:   string;
  createdAt:     string;
  isGrouped:     boolean;
}

interface InvoiceDetail {
  id:            string;
  invoiceNumber: string | null;
  totalAmount:   number;
  amountReceived: number;
  changeGiven:   number;
  cashierName:   string;
  createdAt:     string;
  tenantName:    string;
  tenantPhone:   string | null;
  tenantAddress: string | null;
  tenantSlogan:  string | null;
  items: {
    id:           string;
    productName:  string;
    variantLabel: string;
    qty:          number;
    unitPrice:    number;
    totalLine:    number;
  }[];
}

interface InvoicesShellProps {
  invoices:      Invoice[];
  totalRevenue:  number;
  totalProfit:   number;
  count:         number;
  period:        string;
}

export function InvoicesShell({
  invoices, totalRevenue, totalProfit, count, period
}: InvoicesShellProps) {
  const [search,    setSearch]    = useState("");
  const [detail,    setDetail]    = useState<InvoiceDetail | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [filterType, setFilterType] = useState<"all" | "individual" | "grouped">("all");

  const filtered = invoices.filter((inv) => {
    const matchSearch = (inv.invoiceNumber ?? "").toLowerCase().includes(search.toLowerCase())
      || inv.cashierName.toLowerCase().includes(search.toLowerCase());
    const matchType =
      filterType === "all" ? true
      : filterType === "individual" ? !inv.isGrouped
      : inv.isGrouped;
    return matchSearch && matchType;
  });

  async function openDetail(invoice: Invoice) {
    setLoading(true);
    try {
      const res = await getInvoiceDetailAction(invoice.id);
      if (!res.success) { toast.error(res.error); return; }
      setDetail(res.data as InvoiceDetail);
    } catch {
      toast.error("Erreur chargement facture");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Numéro de facture ou caissière…"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        <div className="flex gap-2">
          {(["all", "individual", "grouped"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                filterType === f
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                  : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white"
              )}
            >
              {f === "all" ? "Toutes" : f === "individual" ? "Individuelles" : "Groupées"}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} facture{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== count && ` sur ${count}`}
      </p>

      {/* Table */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
          {["Facture", "Montant", "Bénéfice", "Caissière", "Date", ""].map((h) => (
            <p key={h} className="text-xs font-semibold text-slate-400">{h}</p>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Aucune facture sur cette période</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {filtered.map((inv) => (
              <div
                key={inv.id}
                className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3.5 items-center hover:bg-slate-700/20 transition-colors cursor-pointer"
                onClick={() => openDetail(inv)}
              >
                {/* Numéro */}
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                    inv.isGrouped ? "bg-violet-500/20" : "bg-blue-500/20"
                  )}>
                    <Receipt className={cn("w-3.5 h-3.5", inv.isGrouped ? "text-violet-400" : "text-blue-400")} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {inv.invoiceNumber ?? (inv.isGrouped ? "Facture groupée" : "—")}
                    </p>
                    {inv.isGrouped && (
                      <span className="text-xs text-violet-400">Groupée</span>
                    )}
                  </div>
                </div>

                {/* Montant */}
                <div>
                  <p className="text-sm font-semibold text-white">{formatMoney(inv.totalAmount)}</p>
                  {inv.changeGiven > 0 && (
                    <p className="text-xs text-slate-400">Rendu: {formatMoney(inv.changeGiven)}</p>
                  )}
                </div>

                {/* Bénéfice */}
                <p className="text-sm text-emerald-400 font-medium">
                  {formatMoney(inv.profit)}
                </p>

                {/* Caissière */}
                <p className="text-sm text-slate-300 truncate">{inv.cashierName}</p>

                {/* Date */}
                <p className="text-xs text-slate-400">{formatDateTime(inv.createdAt)}</p>

                {/* Action */}
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal détail facture ───────────────────────────────────────────── */}
      {detail && (
        <InvoiceDetailModal
          detail={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}

// ── Modal détail + aperçu facture ─────────────────────────────────────────────

function InvoiceDetailModal({
  detail,
  onClose,
}: {
  detail: InvoiceDetail;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {detail.invoiceNumber ?? "Facture"}
              </h2>
              <p className="text-xs text-slate-400">{formatDateTime(detail.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps — aperçu style facture */}
        <div className="p-5 space-y-5">

          {/* En-tête boutique */}
          <div className="text-center pb-4 border-b border-slate-800">
            <p className="text-base font-bold text-white">{detail.tenantName}</p>
            {detail.tenantSlogan  && <p className="text-xs text-slate-400 mt-0.5 italic">{detail.tenantSlogan}</p>}
            {detail.tenantPhone   && <p className="text-xs text-slate-400">{detail.tenantPhone}</p>}
            {detail.tenantAddress && <p className="text-xs text-slate-400">{detail.tenantAddress}</p>}
          </div>

          {/* Méta */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500">Facture N°</span>
              <p className="text-slate-200 font-medium">{detail.invoiceNumber ?? "—"}</p>
            </div>
            <div>
              <span className="text-slate-500">Date</span>
              <p className="text-slate-200 font-medium">{formatDateTime(detail.createdAt)}</p>
            </div>
            <div>
              <span className="text-slate-500">Caissière</span>
              <p className="text-slate-200 font-medium">{detail.cashierName}</p>
            </div>
          </div>

          {/* Lignes produits */}
          <div className="border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-3 py-2 bg-slate-800/60 text-xs font-semibold text-slate-400">
              <span>Produit</span>
              <span className="text-right">Qté</span>
              <span className="text-right">P.U.</span>
              <span className="text-right">Total</span>
            </div>
            <div className="divide-y divide-slate-700/30">
              {detail.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-3 py-2.5 text-xs">
                  <div>
                    <p className="text-white font-medium">{item.productName}</p>
                    <p className="text-slate-400">{item.variantLabel}</p>
                  </div>
                  <p className="text-slate-300 text-right">{item.qty}</p>
                  <p className="text-slate-300 text-right">{formatMoney(item.unitPrice)}</p>
                  <p className="text-white font-medium text-right">{formatMoney(item.totalLine)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totaux */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total</span>
              <span className="font-bold text-white">{formatMoney(detail.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Reçu</span>
              <span className="text-slate-300">{formatMoney(detail.amountReceived)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Monnaie rendue</span>
              <span className="text-slate-300">{formatMoney(detail.changeGiven)}</span>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 pt-2">Merci pour votre achat !</p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-slate-700 text-slate-300 text-sm rounded-xl hover:bg-slate-800 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}