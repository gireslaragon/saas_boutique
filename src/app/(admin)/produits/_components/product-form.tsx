"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Loader2, Package, X } from "lucide-react";
import { toast } from "sonner";
import { createProductAction } from "@/actions/products/create-product.action";
import { cn } from "@/lib/utils/cn";

const variantSchema = z.object({
  label:           z.string().min(1, "Nom requis"),
  variantType:     z.enum(["unit", "pack", "case"]),
  sellingPrice:    z.coerce.number().positive("Prix requis"),
  unitsPerVariant: z.coerce.number().int().positive(),
  alertThreshold:  z.coerce.number().int().min(0),
  initialQty:      z.coerce.number().int().min(0),
});

const formSchema = z.object({
  name:       z.string().min(2, "Nom trop court"),
  categoryId: z.string().nullable(),
  imageUrl:   z.string().url("URL invalide").nullable().or(z.literal("")),
  costPrice:  z.coerce.number().min(0),
  variants:   z.array(variantSchema).min(1, "Au moins une variante"),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  categories: { id: string; name: string; color: string | null }[];
  onSuccess:  () => void;
  onCancel:   () => void;
}

const VARIANT_TYPE_LABELS = { unit: "Unité", pack: "Paquet", case: "Casier" };

export function ProductForm({ categories, onSuccess, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", categoryId: null, imageUrl: "", costPrice: 0,
      variants: [{ label: "Unité", variantType: "unit", sellingPrice: 0, unitsPerVariant: 1, alertThreshold: 0, initialQty: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const result = await createProductAction({
        ...data,
        imageUrl:   data.imageUrl || null,
        categoryId: data.categoryId || null,
      });

      if (!result.success) { toast.error(result.error); return; }
      toast.success("Produit créé avec succès !");
      onSuccess();
    } catch {
      toast.error("Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-semibold text-white">Nouveau produit</h2>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

          {/* Infos de base */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom du produit *</label>
              <input
                {...register("name")}
                className="input-field"
                placeholder="Ex: Castel, Pain de mie, Huile Azur..."
              />
              {errors.name && <p className="error-text">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Catégorie</label>
              <select {...register("categoryId")} className="input-field">
                <option value="">Sans catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Prix d&apos;`achat (FCFA)</label>
              <input type="number" {...register("costPrice")} className="input-field" placeholder="0" min="0" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">URL image (optionnel)</label>
              <input
                {...register("imageUrl")}
                className="input-field"
                placeholder="https://..."
              />
              {errors.imageUrl && <p className="error-text">{errors.imageUrl.message}</p>}
            </div>
          </div>

          {/* Variantes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Variantes de vente *
              </label>
              <button
                type="button"
                onClick={() => append({ label: "", variantType: "unit", sellingPrice: 0, unitsPerVariant: 1, alertThreshold: 0, initialQty: 0 })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 text-xs rounded-lg hover:bg-blue-600/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter variante
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-300">Variante {index + 1}</span>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Nom *</label>
                      <input {...register(`variants.${index}.label`)} className="input-field-sm" placeholder="Bouteille, Casier 12..." />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Type</label>
                      <select {...register(`variants.${index}.variantType`)} className="input-field-sm">
                        {Object.entries(VARIANT_TYPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Prix vente (FCFA) *</label>
                      <input type="number" {...register(`variants.${index}.sellingPrice`)} className="input-field-sm" placeholder="0" min="0" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Unités / variante</label>
                      <input type="number" {...register(`variants.${index}.unitsPerVariant`)} className="input-field-sm" placeholder="1" min="1" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Stock initial</label>
                      <input type="number" {...register(`variants.${index}.initialQty`)} className="input-field-sm" placeholder="0" min="0" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Seuil alerte</label>
                      <input type="number" {...register(`variants.${index}.alertThreshold`)} className="input-field-sm" placeholder="0" min="0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.variants && <p className="error-text mt-1">{errors.variants.message}</p>}
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</> : "Créer le produit"}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: rgb(30 41 59 / 0.8);
          border: 1px solid rgb(51 65 85 / 0.8);
          border-radius: 0.625rem;
          color: white;
          font-size: 0.8125rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus { border-color: rgb(59 130 246 / 0.6); }
        .input-field-sm {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: rgb(15 23 42 / 0.8);
          border: 1px solid rgb(51 65 85 / 0.6);
          border-radius: 0.5rem;
          color: white;
          font-size: 0.75rem;
          outline: none;
        }
        .input-field-sm:focus { border-color: rgb(59 130 246 / 0.5); }
        .error-text { font-size: 0.7rem; color: rgb(248 113 113); margin-top: 0.25rem; }
      `}</style>
    </div>
  );
}