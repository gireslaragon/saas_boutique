"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Package, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { restockAction } from "@/actions/stock/stock.action";
import { formatNumber } from "@/lib/utils/formatters";
import type { StockRow } from "./stock-table";

const schema = z.object({
  qtyUnitsAdded:    z.coerce.number().int().positive("Quantité requise (> 0)"),
  costPricePerUnit: z.coerce.number().min(0, "Prix invalide"),
  supplier:         z.string().optional(),
  notes:            z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RestockModalProps {
  row:       StockRow;
  onClose:   () => void;
  onSuccess: () => void;
}

export function RestockModal({ row, onClose, onSuccess }: RestockModalProps) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { qtyUnitsAdded: 1, costPricePerUnit: 0 },
  });

  const qtyWatch  = watch("qtyUnitsAdded")  || 0;
  const priceWatch = watch("costPricePerUnit") || 0;
  const totalCost = qtyWatch * priceWatch;

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const res = await restockAction({ variantId: row.variantId, ...data });
      if (!res.success) { toast.error(res.error); return; }
      toast.success(`Stock mis à jour — +${data.qtyUnitsAdded} unités`);
      onSuccess();
    } catch {
      toast.error("Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Réapprovisionner</h2>
              <p className="text-xs text-slate-400">{row.productName} — {row.variantLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stock actuel */}
        <div className="mx-5 mt-5 p-3 bg-slate-800/60 rounded-xl flex items-center justify-between">
          <span className="text-xs text-slate-400">Stock actuel</span>
          <div className="text-right">
            <span className="text-sm font-bold text-white">{formatNumber(row.qtyUnits)} unités</span>
            {row.unitsPerVariant > 1 && (
              <p className="text-xs text-slate-500">{formatNumber(row.qtyInPacks)} {row.variantType === "case" ? "casiers" : "paquets"}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            {/* Quantité */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Quantité (unités) *
              </label>
              <input
                type="number"
                {...register("qtyUnitsAdded")}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                min="1"
              />
              {errors.qtyUnitsAdded && <p className="text-xs text-red-400 mt-1">{errors.qtyUnitsAdded.message}</p>}
              {/* Indication en casiers */}
              {row.unitsPerVariant > 1 && qtyWatch > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  = {Math.floor(Number(qtyWatch) / row.unitsPerVariant)} {row.variantType === "case" ? "casiers" : "paquets"} + {Number(qtyWatch) % row.unitsPerVariant} unités
                </p>
              )}
            </div>

            {/* Prix d'achat */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Prix achat/unité (FCFA)
              </label>
              <input
                type="number"
                {...register("costPricePerUnit")}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                min="0"
              />
            </div>
          </div>

          {/* Coût total calculé */}
          {totalCost > 0 && (
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex justify-between items-center">
              <span className="text-xs text-emerald-400">Coût total de la livraison</span>
              <span className="text-sm font-bold text-emerald-300">
                {new Intl.NumberFormat("fr-FR").format(totalCost)} FCFA
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Fournisseur</label>
            <input
              {...register("supplier")}
              className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="Nom du fournisseur…"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes</label>
            <textarea
              {...register("notes")}
              rows={2}
              className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
              placeholder="Remarques optionnelles…"
            />
          </div>

          {/* Aperçu nouveau stock */}
          {qtyWatch > 0 && (
            <div className="p-3 bg-slate-800/60 rounded-xl flex justify-between items-center">
              <span className="text-xs text-slate-400">Stock après réapprovisionnement</span>
              <span className="text-sm font-bold text-white">
                {formatNumber(row.qtyUnits + Number(qtyWatch))} unités
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : "Confirmer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}