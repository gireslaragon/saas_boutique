"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { declareLossAction } from "@/actions/stock/stock.action";
import { formatNumber } from "@/lib/utils/formatters";
import type { StockRow } from "./stock-table";

const schema = z.object({
  qtyUnitsLost:   z.coerce.number().int().positive("Quantité invalide"),
  lossType:       z.enum(["breakage", "theft", "expiry", "error", "other"]),
  reason:         z.string().min(5, "Décrivez le motif (min 5 caractères)"),
  estimatedValue: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

const LOSS_TYPES = [
  { value: "breakage", label: "Casse" },
  { value: "theft",    label: "Vol" },
  { value: "expiry",   label: "Péremption" },
  { value: "error",    label: "Erreur de comptage" },
  { value: "other",    label: "Autre" },
];

interface LossModalProps {
  row:       StockRow;
  onClose:   () => void;
  onSuccess: () => void;
}

export function LossModal({ row, onClose, onSuccess }: LossModalProps) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { qtyUnitsLost: 1, lossType: "breakage", reason: "" },
  });

  const qtyLost = watch("qtyUnitsLost") || 0;
  const newQty  = Math.max(0, row.qtyUnits - Number(qtyLost));

  async function onSubmit(data: FormValues) {
    if (Number(data.qtyUnitsLost) > row.qtyUnits) {
      toast.error("La quantité perdue dépasse le stock disponible");
      return;
    }
    setLoading(true);
    try {
      const res = await declareLossAction({ variantId: row.variantId, ...data });
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Perte enregistrée");
      onSuccess();
    } catch {
      toast.error("Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-red-500/20 rounded-2xl w-full max-w-md">

        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Déclarer une perte</h2>
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
          <span className="text-sm font-bold text-white">{formatNumber(row.qtyUnits)} unités</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Quantité perdue *</label>
              <input
                type="number"
                {...register("qtyUnitsLost")}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-red-500/20 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                min="1"
                max={row.qtyUnits}
              />
              {errors.qtyUnitsLost && <p className="text-xs text-red-400 mt-1">{errors.qtyUnitsLost.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Type de perte *</label>
              <select
                {...register("lossType")}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-red-500/20 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
              >
                {LOSS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Valeur estimée (FCFA)</label>
            <input
              type="number"
              {...register("estimatedValue")}
              className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
              min="0"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Motif détaillé *</label>
            <textarea
              {...register("reason")}
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors resize-none"
              placeholder="Décrivez ce qui s'est passé…"
            />
            {errors.reason && <p className="text-xs text-red-400 mt-1">{errors.reason.message}</p>}
          </div>

          {/* Aperçu nouveau stock */}
          {qtyLost > 0 && qtyLost <= row.qtyUnits && (
            <div className={`p-3 rounded-xl flex justify-between items-center ${
              newQty === 0 ? "bg-red-500/10 border border-red-500/30"
              : newQty <= row.alertThreshold ? "bg-amber-500/10 border border-amber-500/30"
              : "bg-slate-800/60"
            }`}>
              <span className="text-xs text-slate-400">Stock après déclaration</span>
              <span className={`text-sm font-bold ${
                newQty === 0 ? "text-red-400"
                : newQty <= row.alertThreshold ? "text-amber-400"
                : "text-white"
              }`}>
                {formatNumber(newQty)} unités
                {newQty === 0 && " — RUPTURE"}
              </span>
            </div>
          )}

          {qtyLost > row.qtyUnits && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              ⚠️ La quantité dépasse le stock disponible ({formatNumber(row.qtyUnits)} unités)
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading || qtyLost > row.qtyUnits}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : "Confirmer la perte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}