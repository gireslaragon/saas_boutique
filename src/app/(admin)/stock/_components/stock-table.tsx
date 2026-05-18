"use client";

import { useState } from "react";
import {
  Search, AlertTriangle, XCircle,
  CheckCircle2, Plus, Minus, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatMoney, formatNumber, formatDateTime } from "@/lib/utils/formatters";

export interface StockRow {
  variantId:       string;
  variantLabel:    string;
  variantType:     string;
  sellingPrice:    number;
  costPrice?:      number;
  unitsPerVariant: number;
  alertThreshold:  number;
  productId:       string;
  productName:     string;
  imageUrl:        string | null;
  categoryName:    string | null;
  categoryColor:   string | null;
  isActive:        boolean;
  qtyUnits:        number;
  qtyInPacks:      number;
  isLowStock:      boolean;
  isOutOfStock:    boolean;
  lastMovement:    string | null;
}

interface StockTableProps {
  data:        StockRow[];
  onRestock:   (row: StockRow) => void;
  onLoss:      (row: StockRow) => void;
}

type SortKey = "name" | "qty" | "status";

export function StockTable({ data, onRestock, onLoss }: StockTableProps) {
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState<"all" | "low" | "out" | "ok">("all");
  const [sortKey,   setSortKey]   = useState<SortKey>("name");
  const [sortAsc,   setSortAsc]   = useState(true);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  const filtered = data
    .filter((r) => {
      const matchSearch = r.productName.toLowerCase().includes(search.toLowerCase())
        || r.variantLabel.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "all" ? true
        : filter === "out" ? r.isOutOfStock
        : filter === "low" ? r.isLowStock
        : !r.isLowStock && !r.isOutOfStock;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.productName.localeCompare(b.productName);
      if (sortKey === "qty")  cmp = a.qtyUnits - b.qtyUnits;
      if (sortKey === "status") {
        const score = (r: StockRow) => r.isOutOfStock ? 0 : r.isLowStock ? 1 : 2;
        cmp = score(a) - score(b);
      }
      return sortAsc ? cmp : -cmp;
    });

  function renderSortBtn(k: SortKey, label: string) {
    return (
      <button
        onClick={() => toggleSort(k)}
        className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        {label}
        <ArrowUpDown className={cn("w-3 h-3", sortKey === k && "text-blue-400")} />
      </button>
    );
  }

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Filtres statut */}
        <div className="flex gap-2">
          {(["all", "out", "low", "ok"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                filter === f
                  ? f === "out" ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : f === "low" ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : f === "ok"  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-blue-600/20 border-blue-500/40 text-blue-300"
                  : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white"
              )}
            >
              {f === "all" ? "Tous" : f === "out" ? "Rupture" : f === "low" ? "Faible" : "OK"}
            </button>
          ))}
        </div>
      </div>

      {/* Compteur */}
      <p className="text-xs text-slate-500">{filtered.length} produit{filtered.length !== 1 ? "s" : ""}</p>

      {/* Table */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
          {renderSortBtn("name", "Produit")}
          {renderSortBtn("qty", "Stock")}
          <div className="text-xs font-semibold text-slate-400">Paquets/Casiers</div>
          {renderSortBtn("status", "Statut")}
          <div className="text-xs font-semibold text-slate-400">Actions</div>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Aucun résultat
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {filtered.map((row) => (
              <div
                key={row.productId}
                className={cn(
                  "grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3.5 items-center",
                  "hover:bg-slate-700/20 transition-colors",
                )}
              >
                {/* Produit */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-700 flex-shrink-0 overflow-hidden">
                    {row.imageUrl
                      ? <img src={row.imageUrl} alt={row.productName} className="w-full h-full object-cover" />
                      : <span className="flex items-center justify-center h-full text-slate-500 text-xs">?</span>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{row.productName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-md",
                        row.variantType === "unit" ? "bg-blue-500/20 text-blue-300"
                        : row.variantType === "pack" ? "bg-violet-500/20 text-violet-300"
                        : "bg-amber-500/20 text-amber-300"
                      )}>
                        {row.variantLabel}
                      </span>
                      {row.categoryName && (
                        <span className="text-xs text-slate-500">{row.categoryName}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock unités */}
                <div>
                  <p className={cn(
                    "text-sm font-bold",
                    row.isOutOfStock ? "text-red-400"
                    : row.isLowStock  ? "text-amber-400"
                    : "text-emerald-400"
                  )}>
                    {formatNumber(row.qtyUnits)} unités
                  </p>
                  {row.lastMovement && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDateTime(row.lastMovement)}
                    </p>
                  )}
                </div>

                {/* Paquets/Casiers */}
                <div>
                  {row.unitsPerVariant > 1 ? (
                    <>
                      <p className="text-sm text-white font-medium">{formatNumber(row.qtyInPacks)}</p>
                      <p className="text-xs text-slate-500">{row.unitsPerVariant} u/{row.variantType === "case" ? "casier" : "paquet"}</p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">—</p>
                  )}
                </div>

                {/* Statut */}
                <div>
                  {row.isOutOfStock ? (
                    <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Rupture
                    </span>
                  ) : row.isLowStock ? (
                    <div>
                      <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> Faible
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">Seuil: {row.alertThreshold}</p>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> OK
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onRestock(row)}
                    title="Réapprovisionner"
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs rounded-lg border border-emerald-500/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Stock
                  </button>
                  <button
                    onClick={() => onLoss(row)}
                    title="Déclarer perte"
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded-lg border border-red-500/20 transition-colors"
                  >
                    <Minus className="w-3 h-3" /> Perte
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}