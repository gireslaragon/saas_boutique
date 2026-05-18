"use client";

import { useState } from "react";
import {
  Package, Search, Plus, MoreVertical,
  Eye, EyeOff, Edit2, AlertTriangle, CheckCircle2,
  XCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { formatMoney, formatNumber, formatDate } from "@/lib/utils/formatters";
import { toggleProductAction } from "@/actions/products/create-product.action.server";
import type { ProductWithVariants } from "@/actions/products/get-products.action";

interface ProductTableProps {
  products:   ProductWithVariants[];
  categories: { id: string; name: string; color: string | null }[];
  onAdd:      () => void;
  onRefresh:  () => void;
}

export function ProductTable({ products, categories, onAdd, onRefresh }: ProductTableProps) {
  const [search, setSearch]         = useState("");
  const [filterCat, setFilterCat]   = useState<string>("all");
  const [filterStatus, setStatus]   = useState<"all" | "active" | "inactive">("all");
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen]     = useState<string | null>(null);
  const [toggling, setToggling]     = useState<string | null>(null);

  // ── Filtres ────────────────────────────────────────────────────────────────
  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = filterCat === "all" || p.categoryId === filterCat;
    const matchStatus = filterStatus === "all"
      || (filterStatus === "active"   &&  p.isActive)
      || (filterStatus === "inactive" && !p.isActive);
    return matchSearch && matchCat && matchStatus;
  });

  // ── Toggle expand variantes ────────────────────────────────────────────────
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Activer / Désactiver ───────────────────────────────────────────────────
  async function handleToggle(productId: string, currentActive: boolean) {
    setToggling(productId);
    setMenuOpen(null);
    try {
      const res = await toggleProductAction(productId, !currentActive);
      if (!res.success) { toast.error(res.error); return; }
      toast.success(currentActive ? "Produit désactivé" : "Produit activé");
      onRefresh();
    } catch {
      toast.error("Erreur inattendue");
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Filtre catégorie */}
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 transition-colors"
        >
          <option value="all">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Filtre statut */}
        <select
          value={filterStatus}
          onChange={(e) => setStatus(e.target.value as "all" | "active" | "inactive")}
          className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 transition-colors"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="inactive">Désactivés</option>
        </select>

        {/* Bouton ajouter */}
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nouveau produit
        </button>
      </div>

      {/* ── Compteur ────────────────────────────────────────────────────────── */}
      <p className="text-xs text-slate-500">
        {filtered.length} produit{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== products.length && ` sur ${products.length}`}
      </p>

      {/* ── Liste produits ───────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Package className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Aucun produit trouvé</p>
          <button onClick={onAdd} className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            Ajouter le premier produit →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((product) => {
            const isExpanded  = expanded.has(product.id);
            const hasLowStock = product.variants.some((v) => v.isLowStock);
            const hasOutStock = product.variants.some((v) => v.isOutOfStock);

            return (
              <div
                key={product.id}
                className={cn(
                  "bg-slate-800/40 border rounded-2xl overflow-hidden transition-all",
                  !product.isActive     && "opacity-60",
                  hasOutStock           && "border-red-500/30",
                  hasLowStock && !hasOutStock && "border-amber-500/30",
                  !hasLowStock && !hasOutStock && "border-slate-700/50",
                )}
              >
                {/* Ligne principale */}
                <div className="flex items-center gap-4 p-4">

                  {/* Image */}
                  <div className="w-12 h-12 rounded-xl bg-slate-700/60 flex-shrink-0 overflow-hidden">
                    {product.imageUrl
                      ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      : <Package className="w-5 h-5 text-slate-500 m-auto mt-3.5" />
                    }
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{product.name}</span>

                      {/* Badge catégorie */}
                      {product.categoryName && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: product.categoryColor + "33", border: `1px solid ${product.categoryColor}55`, color: product.categoryColor ?? "#fff" }}
                        >
                          {product.categoryName}
                        </span>
                      )}

                      {/* Badge statut */}
                      {!product.isActive && (
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full border border-slate-600">
                          Désactivé
                        </span>
                      )}
                      {hasOutStock && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20">
                          <XCircle className="w-3 h-3" /> Rupture
                        </span>
                      )}
                      {hasLowStock && !hasOutStock && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" /> Stock faible
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>Coût: {formatMoney(product.costPrice)}</span>
                      <span>·</span>
                      <span>{product.variants.length} variante{product.variants.length !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>Créé le {formatDate(product.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Expand variantes */}
                    <button
                      onClick={() => toggleExpand(product.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      Variantes
                    </button>

                    {/* Menu contextuel */}
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === product.id ? null : product.id)}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {menuOpen === product.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden py-1">
                            <button
                              onClick={() => handleToggle(product.id, product.isActive)}
                              disabled={toggling === product.id}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                              {product.isActive
                                ? <><EyeOff className="w-3.5 h-3.5" /> Désactiver</>
                                : <><Eye    className="w-3.5 h-3.5" /> Activer</>
                              }
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Variantes expandées */}
                {isExpanded && (
                  <div className="border-t border-slate-700/50 bg-slate-900/40">
                    <div className="p-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Variantes</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {product.variants.map((v) => (
                          <div
                            key={v.id}
                            className={cn(
                              "p-3 rounded-xl border text-xs",
                              v.isOutOfStock ? "bg-red-500/5 border-red-500/20"
                              : v.isLowStock ? "bg-amber-500/5 border-amber-500/20"
                              : "bg-slate-800/60 border-slate-700/40"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-white">{v.label}</span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-md text-xs font-medium",
                                v.variantType === "unit" ? "bg-blue-500/20 text-blue-300"
                                : v.variantType === "pack" ? "bg-violet-500/20 text-violet-300"
                                : "bg-amber-500/20 text-amber-300"
                              )}>
                                {v.variantType === "unit" ? "Unité" : v.variantType === "pack" ? "Paquet" : "Casier"}
                              </span>
                            </div>
                            <div className="space-y-1 text-slate-400">
                              <div className="flex justify-between">
                                <span>Prix vente</span>
                                <span className="text-white font-medium">{formatMoney(v.sellingPrice)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Stock (unités)</span>
                                <span className={cn(
                                  "font-medium",
                                  v.isOutOfStock ? "text-red-400"
                                  : v.isLowStock  ? "text-amber-400"
                                  : "text-emerald-400"
                                )}>
                                  {formatNumber(v.qtyUnits)}
                                </span>
                              </div>
                              {v.unitsPerVariant > 1 && (
                                <div className="flex justify-between">
                                  <span>En paquets/casiers</span>
                                  <span className="text-white">{formatNumber(v.qtyInPacks)} ({v.unitsPerVariant} u/v)</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>Seuil alerte</span>
                                <span className="text-slate-300">{v.alertThreshold} unités</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}