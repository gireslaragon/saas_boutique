// "use client";

// import { useState } from "react";
// import { useForm, useFieldArray } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Plus, Trash2, Loader2, Package, X } from "lucide-react";
// import { toast } from "sonner";
// import { createProductAction } from "@/actions/products/create-product.action";
// import { cn } from "@/lib/utils/cn";

// const variantSchema = z.object({
//   label:           z.string().min(1, "Nom requis"),
//   variantType:     z.enum(["unit", "pack", "case"]),
//   sellingPrice:    z.coerce.number().positive("Prix requis"),
//   unitsPerVariant: z.coerce.number().int().positive(),
//   alertThreshold:  z.coerce.number().int().min(0),
//   initialQty:      z.coerce.number().int().min(0),
// });

// const formSchema = z.object({
//   name:       z.string().min(2, "Nom trop court"),
//   categoryId: z.string().nullable(),
//   imageUrl:   z.string().url("URL invalide").nullable().or(z.literal("")),
//   costPrice:  z.coerce.number().min(0),
//   variants:   z.array(variantSchema).min(1, "Au moins une variante"),
// });

// type FormValues = z.infer<typeof formSchema>;

// interface ProductFormProps {
//   categories: { id: string; name: string; color: string | null }[];
//   onSuccess:  () => void;
//   onCancel:   () => void;
// }

// const VARIANT_TYPE_LABELS = { unit: "Unité", pack: "Paquet", case: "Casier" };

// export function ProductForm({ categories, onSuccess, onCancel }: ProductFormProps) {
//   const [loading, setLoading] = useState(false);

//   const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       name: "", categoryId: null, imageUrl: "", costPrice: 0,
//       variants: [{ label: "Unité", variantType: "unit", sellingPrice: 0, unitsPerVariant: 1, alertThreshold: 0, initialQty: 0 }],
//     },
//   });

//   const { fields, append, remove } = useFieldArray({ control, name: "variants" });

//   async function onSubmit(data: FormValues) {
//     setLoading(true);
//     try {
//       const result = await createProductAction({
//         ...data,
//         imageUrl:   data.imageUrl || null,
//         categoryId: data.categoryId || null,
//       });

//       if (!result.success) { toast.error(result.error); return; }
//       toast.success("Produit créé avec succès !");
//       onSuccess();
//     } catch {
//       toast.error("Erreur inattendue");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
//       <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

//         {/* Header */}
//         <div className="flex items-center justify-between p-6 border-b border-slate-800">
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
//               <Package className="w-4 h-4 text-white" />
//             </div>
//             <h2 className="text-base font-semibold text-white">Nouveau produit</h2>
//           </div>
//           <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
//             <X className="w-5 h-5" />
//           </button>
//         </div>

//         <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

//           {/* Infos de base */}
//           <div className="grid grid-cols-2 gap-4">
//             <div className="col-span-2">
//               <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom du produit *</label>
//               <input
//                 {...register("name")}
//                 className="input-field"
//                 placeholder="Ex: Castel, Pain de mie, Huile Azur..."
//               />
//               {errors.name && <p className="error-text">{errors.name.message}</p>}
//             </div>

//             <div>
//               <label className="block text-xs font-medium text-slate-400 mb-1.5">Catégorie</label>
//               <select {...register("categoryId")} className="input-field">
//                 <option value="">Sans catégorie</option>
//                 {categories.map((c) => (
//                   <option key={c.id} value={c.id}>{c.name}</option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label className="block text-xs font-medium text-slate-400 mb-1.5">Prix d&apos;`achat (FCFA)</label>
//               <input type="number" {...register("costPrice")} className="input-field" placeholder="0" min="0" />
//             </div>

//             <div className="col-span-2">
//               <label className="block text-xs font-medium text-slate-400 mb-1.5">URL image (optionnel)</label>
//               <input
//                 {...register("imageUrl")}
//                 className="input-field"
//                 placeholder="https://..."
//               />
//               {errors.imageUrl && <p className="error-text">{errors.imageUrl.message}</p>}
//             </div>
//           </div>

//           {/* Variantes */}
//           <div>
//             <div className="flex items-center justify-between mb-3">
//               <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
//                 Variantes de vente *
//               </label>
//               <button
//                 type="button"
//                 onClick={() => append({ label: "", variantType: "unit", sellingPrice: 0, unitsPerVariant: 1, alertThreshold: 0, initialQty: 0 })}
//                 className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 text-xs rounded-lg hover:bg-blue-600/30 transition-colors"
//               >
//                 <Plus className="w-3.5 h-3.5" /> Ajouter variante
//               </button>
//             </div>

//             <div className="space-y-3">
//               {fields.map((field, index) => (
//                 <div key={field.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
//                   <div className="flex items-center justify-between mb-3">
//                     <span className="text-xs font-medium text-slate-300">Variante {index + 1}</span>
//                     {fields.length > 1 && (
//                       <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-300 transition-colors">
//                         <Trash2 className="w-3.5 h-3.5" />
//                       </button>
//                     )}
//                   </div>

//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <label className="text-xs text-slate-400 mb-1 block">Nom *</label>
//                       <input {...register(`variants.${index}.label`)} className="input-field-sm" placeholder="Bouteille, Casier 12..." />
//                     </div>
//                     <div>
//                       <label className="text-xs text-slate-400 mb-1 block">Type</label>
//                       <select {...register(`variants.${index}.variantType`)} className="input-field-sm">
//                         {Object.entries(VARIANT_TYPE_LABELS).map(([v, l]) => (
//                           <option key={v} value={v}>{l}</option>
//                         ))}
//                       </select>
//                     </div>
//                     <div>
//                       <label className="text-xs text-slate-400 mb-1 block">Prix vente (FCFA) *</label>
//                       <input type="number" {...register(`variants.${index}.sellingPrice`)} className="input-field-sm" placeholder="0" min="0" />
//                     </div>
//                     <div>
//                       <label className="text-xs text-slate-400 mb-1 block">Unités / variante</label>
//                       <input type="number" {...register(`variants.${index}.unitsPerVariant`)} className="input-field-sm" placeholder="1" min="1" />
//                     </div>
//                     <div>
//                       <label className="text-xs text-slate-400 mb-1 block">Stock initial</label>
//                       <input type="number" {...register(`variants.${index}.initialQty`)} className="input-field-sm" placeholder="0" min="0" />
//                     </div>
//                     <div>
//                       <label className="text-xs text-slate-400 mb-1 block">Seuil alerte</label>
//                       <input type="number" {...register(`variants.${index}.alertThreshold`)} className="input-field-sm" placeholder="0" min="0" />
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//             {errors.variants && <p className="error-text mt-1">{errors.variants.message}</p>}
//           </div>

//           {/* Boutons */}
//           <div className="flex gap-3 pt-2">
//             <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">
//               Annuler
//             </button>
//             <button
//               type="submit"
//               disabled={loading}
//               className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
//             >
//               {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</> : "Créer le produit"}
//             </button>
//           </div>
//         </form>
//       </div>

//       <style jsx>{`
//         .input-field {
//           width: 100%;
//           padding: 0.625rem 0.875rem;
//           background: rgb(30 41 59 / 0.8);
//           border: 1px solid rgb(51 65 85 / 0.8);
//           border-radius: 0.625rem;
//           color: white;
//           font-size: 0.8125rem;
//           outline: none;
//           transition: border-color 0.15s;
//         }
//         .input-field:focus { border-color: rgb(59 130 246 / 0.6); }
//         .input-field-sm {
//           width: 100%;
//           padding: 0.5rem 0.75rem;
//           background: rgb(15 23 42 / 0.8);
//           border: 1px solid rgb(51 65 85 / 0.6);
//           border-radius: 0.5rem;
//           color: white;
//           font-size: 0.75rem;
//           outline: none;
//         }
//         .input-field-sm:focus { border-color: rgb(59 130 246 / 0.5); }
//         .error-text { font-size: 0.7rem; color: rgb(248 113 113); margin-top: 0.25rem; }
//       `}</style>
//     </div>
//   );
// }


"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X, Plus, Trash2, Loader2, Package,
  ShoppingCart, AlertTriangle, Info,
  ChevronDown, ChevronUp, Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { formatMoney, formatNumber } from "@/lib/utils/formatters";
import {
  toBaseUnits,
  calcCostPerUnit,
  type PurchaseUnit,
} from "@/actions/products/create-product.action";
import { createProductAction } from "@/actions/products/create-product.action.server";

// ─── Schéma formulaire ────────────────────────────────────────────────────────

const variantSchema = z.object({
  label:           z.string().min(1, "Nom requis"),
  variantType:     z.enum(["unit", "pack", "case"]),
  sellingPrice:    z.coerce.number().positive("Prix requis"),
  unitsPerVariant: z.coerce.number().int().min(1),
});

const formSchema = z.object({
  name:              z.string().min(2, "Nom requis (min 2 caractères)"),
  categoryId:        z.string().nullable().optional(),
  imageUrl:          z.string().optional(),
  purchaseTotalCost: z.coerce.number().min(0, "Coût requis"),
  purchaseQty:       z.coerce.number().int().positive("Quantité requise"),
  purchaseUnit:      z.enum(["unit", "pack", "case"]),
  purchaseUnitSize:  z.coerce.number().int().min(1).default(1),
  alertQty:          z.coerce.number().int().min(0),
  alertUnit:         z.enum(["unit", "pack", "case"]),
  alertUnitSize:     z.coerce.number().int().min(1).default(1),
  variants:          z.array(variantSchema).min(1, "Au moins une variante"),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Constantes ───────────────────────────────────────────────────────────────

const UNIT_LABELS: Record<string, string> = {
  unit: "Unité",
  pack: "Paquet",
  case: "Casier",
};

const VARIANT_TYPE_COLORS: Record<string, string> = {
  unit: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  pack: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  case: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

// ─── Composants helpers ───────────────────────────────────────────────────────

function Field({
  label, hint, error, required, children,
}: {
  label: string; hint?: string; error?: string;
  required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint  && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl",
        "text-sm text-white placeholder-slate-500",
        "focus:outline-none focus:border-blue-500/60 transition-colors",
        props.className,
      )}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <select
      {...props}
      className={cn(
        "px-3 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl",
        "text-sm text-white",
        "focus:outline-none focus:border-blue-500/60 transition-colors",
        props.className,
      )}
    />
  );
}

function SectionHeader({ step, title, icon: Icon }: { step: number; title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-blue-300">{step}</span>
      </div>
      <Icon className="w-4 h-4 text-slate-400" />
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
  );
}

// ─── Preview calcul (live) ────────────────────────────────────────────────────

function CalcPreview({
  totalCost, qty, unit, unitSize, alertQty, alertUnit, alertUnitSize,
}: {
  totalCost: number; qty: number; unit: PurchaseUnit; unitSize: number;
  alertQty: number; alertUnit: PurchaseUnit; alertUnitSize: number;
}) {
  const totalUnits      = toBaseUnits(qty || 0, unit, unitSize || 1);
  const costPerUnit     = calcCostPerUnit(totalCost || 0, qty || 0, unit, unitSize || 1);
  const alertUnits      = toBaseUnits(alertQty || 0, alertUnit, alertUnitSize || 1);

  if (!qty || !totalCost) return null;

  return (
    <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2">
      <div className="flex items-center gap-1.5 mb-2">
        <Calculator className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-semibold text-blue-300">Calcul automatique</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-800/60 rounded-lg p-2">
          <p className="text-slate-400 mb-0.5">Stock initial</p>
          <p className="font-bold text-emerald-400">{formatNumber(totalUnits)} unités de base</p>
          {unit !== "unit" && (
            <p className="text-slate-500 text-xs">
              {qty} {unit === "case" ? "casier" : "paquet"}{qty > 1 ? "s" : ""} × {unitSize}
            </p>
          )}
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2">
          <p className="text-slate-400 mb-0.5">Coût / unité de base</p>
          <p className="font-bold text-amber-400">{formatMoney(costPerUnit)}</p>
          <p className="text-slate-500 text-xs">
            {formatMoney(totalCost)} ÷ {formatNumber(totalUnits)}
          </p>
        </div>
        {alertQty > 0 && (
          <div className="bg-slate-800/60 rounded-lg p-2 col-span-2">
            <p className="text-slate-400 mb-0.5">Seuil d&apos;alerte</p>
            <p className="font-bold text-red-400">{formatNumber(alertUnits)} unités de base</p>
            {alertUnit !== "unit" && (
              <p className="text-slate-500 text-xs">
                {alertQty} {alertUnit === "case" ? "casier" : "paquet"}{alertQty > 1 ? "s" : ""} × {alertUnitSize}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Formulaire principal ─────────────────────────────────────────────────────

interface ProductFormProps {
  categories: { id: string; name: string; color: string | null }[];
  onSuccess:  () => void;
  onCancel:   () => void;
}

export function ProductForm({ categories, onSuccess, onCancel }: ProductFormProps) {
  const [loading,  setLoading]  = useState(false);
  const [sections, setSections] = useState({ achat: true, alerte: true, variantes: true });

  const {
    register, control, handleSubmit, watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name:              "",
      categoryId:        null,
      imageUrl:          "",
      purchaseTotalCost: 0,
      purchaseQty:       1,
      purchaseUnit:      "unit",
      purchaseUnitSize:  1,
      alertQty:          0,
      alertUnit:         "unit",
      alertUnitSize:     1,
      variants: [
        { label: "Unité", variantType: "unit", sellingPrice: 0, unitsPerVariant: 1 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  // Watch pour le preview live
  const [
    purchaseTotalCost, purchaseQty, purchaseUnit, purchaseUnitSize,
    alertQty, alertUnit, alertUnitSize,
  ] = watch([
    "purchaseTotalCost", "purchaseQty", "purchaseUnit", "purchaseUnitSize",
    "alertQty", "alertUnit", "alertUnitSize",
  ]);

  const showPurchaseUnitSize = purchaseUnit !== "unit";
  const showAlertUnitSize    = alertUnit    !== "unit";

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const res = await createProductAction({
        ...data,
        imageUrl:   data.imageUrl   || null,
        categoryId: data.categoryId || null,
      });
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Produit créé avec succès !");
      onSuccess();
    } catch {
      toast.error("Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(key: keyof typeof sections) {
    setSections((s) => ({ ...s, [key]: !s[key] }));
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Nouveau produit</h2>
              <p className="text-xs text-slate-400">Stock unifié en unités de base</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Corps scrollable ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── SECTION 1 : Informations générales ─────────────────────── */}
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
            <SectionHeader step={1} title="Informations générales" icon={Package} />

            <div className="space-y-4">
              <Field label="Nom du produit" required error={errors.name?.message}>
                <Input
                  {...register("name")}
                  placeholder="Ex : Castel, Pain de mie, Huile Azur…"
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Catégorie">
                  <Select {...register("categoryId")} className="w-full">
                    <option value="">Sans catégorie</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="URL image" hint="Lien Cloudinary ou externe">
                  <Input
                    {...register("imageUrl")}
                    placeholder="https://…"
                    type="url"
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* ── SECTION 2 : Achat / Approvisionnement ──────────────────── */}
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
            <button
              type="button"
              onClick={() => toggleSection("achat")}
              className="w-full flex items-center justify-between mb-0"
            >
              <SectionHeader step={2} title="Approvisionnement (comment j'achète)" icon={ShoppingCart} />
              {sections.achat
                ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
              }
            </button>

            {sections.achat && (
              <div className="space-y-4 mt-2">
                {/* Coût total */}
                <Field
                  label="Coût total d'achat (FCFA)"
                  required
                  hint="Le montant total payé au fournisseur pour cette livraison"
                  error={errors.purchaseTotalCost?.message}
                >
                  <Input
                    type="number"
                    {...register("purchaseTotalCost")}
                    placeholder="Ex : 20 000"
                    min="0"
                  />
                </Field>

                {/* Quantité achetée + unité */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Field label="Quantité" required error={errors.purchaseQty?.message}>
                      <Input
                        type="number"
                        {...register("purchaseQty")}
                        placeholder="10"
                        min="1"
                      />
                    </Field>
                  </div>

                  <div className="col-span-1">
                    <Field label="En">
                      <Select {...register("purchaseUnit")} className="w-full">
                        <option value="unit">Unité</option>
                        <option value="pack">Paquet</option>
                        <option value="case">Casier</option>
                      </Select>
                    </Field>
                  </div>

                  <div className={cn("col-span-1 transition-all", !showPurchaseUnitSize && "opacity-40 pointer-events-none")}>
                    <Field
                      label={purchaseUnit === "case" ? "Unités / casier" : "Unités / paquet"}
                      hint={showPurchaseUnitSize ? "Contenu du contenant" : "N/A pour unité"}
                    >
                      <Input
                        type="number"
                        {...register("purchaseUnitSize")}
                        placeholder="12"
                        min="1"
                        disabled={!showPurchaseUnitSize}
                      />
                    </Field>
                  </div>
                </div>

                {/* Preview calcul live */}
                <CalcPreview
                  totalCost={Number(purchaseTotalCost)}
                  qty={Number(purchaseQty)}
                  unit={purchaseUnit as PurchaseUnit}
                  unitSize={Number(purchaseUnitSize) || 1}
                  alertQty={Number(alertQty)}
                  alertUnit={alertUnit as PurchaseUnit}
                  alertUnitSize={Number(alertUnitSize) || 1}
                />
              </div>
            )}
          </div>

          {/* ── SECTION 3 : Seuil d'alerte ─────────────────────────────── */}
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
            <button
              type="button"
              onClick={() => toggleSection("alerte")}
              className="w-full flex items-center justify-between"
            >
              <SectionHeader step={3} title="Seuil d'alerte stock" icon={AlertTriangle} />
              {sections.alerte
                ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
              }
            </button>

            {sections.alerte && (
              <div className="space-y-3 mt-2">
                <p className="text-xs text-slate-400">
                  Vous recevrez une alerte quand le stock descend en dessous de ce seuil.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Field label="Quantité" error={errors.alertQty?.message}>
                      <Input
                        type="number"
                        {...register("alertQty")}
                        placeholder="2"
                        min="0"
                      />
                    </Field>
                  </div>

                  <div className="col-span-1">
                    <Field label="En">
                      <Select {...register("alertUnit")} className="w-full">
                        <option value="unit">Unité</option>
                        <option value="pack">Paquet</option>
                        <option value="case">Casier</option>
                      </Select>
                    </Field>
                  </div>

                  <div className={cn("col-span-1 transition-all", !showAlertUnitSize && "opacity-40 pointer-events-none")}>
                    <Field label={alertUnit === "case" ? "Unités / casier" : "Unités / paquet"}>
                      <Input
                        type="number"
                        {...register("alertUnitSize")}
                        placeholder="12"
                        min="1"
                        disabled={!showAlertUnitSize}
                      />
                    </Field>
                  </div>
                </div>

                {/* Exemple contextuel */}
                {alertQty > 0 && (
                  <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-300">
                      <span className="font-semibold">Exemple : </span>
                      Alerte quand il reste moins de{" "}
                      <span className="font-bold">
                        {formatNumber(toBaseUnits(Number(alertQty) || 0, alertUnit as PurchaseUnit, Number(alertUnitSize) || 1))} unités de base
                      </span>
                      {alertUnit !== "unit" && (
                        <span>
                          {" "}({alertQty} {alertUnit === "case" ? "casier" : "paquet"}{Number(alertQty) > 1 ? "s" : ""})
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── SECTION 4 : Variantes de vente ─────────────────────────── */}
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-300">4</span>
                </div>
                <ShoppingCart className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-white">Variantes de vente</h3>
              </div>
              <button
                type="button"
                onClick={() => append({ label: "", variantType: "unit", sellingPrice: 0, unitsPerVariant: 1 })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-medium rounded-lg border border-blue-500/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            {/* Info importante */}
            <div className="mb-4 p-3 bg-slate-700/40 border border-slate-600/30 rounded-lg flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                Chaque variante est une façon de vendre ce produit. Le prix est fixé manuellement.
                Le champ <span className="text-slate-200 font-medium">Unités consommées</span> indique
                combien d&apos;unités de base sont déduites du stock à chaque vente.
              </p>
            </div>

            {errors.variants && (
              <p className="text-xs text-red-400 mb-3">{errors.variants.message}</p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => {
                const variantType = watch(`variants.${index}.variantType`);
                const isUnit = variantType === "unit";

                return (
                  <div
                    key={field.id}
                    className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4"
                  >
                    {/* Header variante */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-xs font-medium border",
                          VARIANT_TYPE_COLORS[variantType] ?? VARIANT_TYPE_COLORS.unit,
                        )}>
                          {UNIT_LABELS[variantType] ?? "Unité"}
                        </span>
                        <span className="text-xs text-slate-400">Variante {index + 1}</span>
                      </div>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Nom */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Nom *</label>
                        <Input
                          {...register(`variants.${index}.label`)}
                          placeholder={
                            variantType === "unit" ? "Bouteille"
                            : variantType === "pack" ? "Paquet 6"
                            : "Casier 12"
                          }
                          className="text-xs"
                        />
                        {errors.variants?.[index]?.label && (
                          <p className="text-xs text-red-400 mt-0.5">{errors.variants[index]?.label?.message}</p>
                        )}
                      </div>

                      {/* Type */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Type</label>
                        <Select {...register(`variants.${index}.variantType`)} className="w-full text-xs">
                          <option value="unit">Unité</option>
                          <option value="pack">Paquet</option>
                          <option value="case">Casier</option>
                        </Select>
                      </div>

                      {/* Prix de vente */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Prix de vente (FCFA) *
                        </label>
                        <Input
                          type="number"
                          {...register(`variants.${index}.sellingPrice`)}
                          placeholder="1 000"
                          min="0"
                          className="text-xs"
                        />
                        {errors.variants?.[index]?.sellingPrice && (
                          <p className="text-xs text-red-400 mt-0.5">{errors.variants[index]?.sellingPrice?.message}</p>
                        )}
                      </div>

                      {/* Unités consommées */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Unités consommées *
                          {isUnit && <span className="text-slate-500 ml-1">(= 1 pour unité)</span>}
                        </label>
                        <Input
                          type="number"
                          {...register(`variants.${index}.unitsPerVariant`)}
                          placeholder={variantType === "unit" ? "1" : variantType === "pack" ? "6" : "12"}
                          min="1"
                          className="text-xs"
                        />
                        <p className="text-xs text-slate-500 mt-0.5">
                          Vendre 1 {watch(`variants.${index}.label`) || "variante"} →
                          retire <span className="text-white font-medium">
                            {watch(`variants.${index}.unitsPerVariant`) || "?"} unité{(watch(`variants.${index}.unitsPerVariant`) || 0) > 1 ? "s" : ""}
                          </span> du stock
                        </p>
                      </div>
                    </div>

                    {/* Bénéfice estimé en live */}
                    {(() => {
                      const price      = Number(watch(`variants.${index}.sellingPrice`)) || 0;
                      const consume    = Number(watch(`variants.${index}.unitsPerVariant`)) || 1;
                      const totalUnits = toBaseUnits(Number(purchaseQty) || 0, purchaseUnit as PurchaseUnit, Number(purchaseUnitSize) || 1);
                      const cpu        = calcCostPerUnit(Number(purchaseTotalCost) || 0, Number(purchaseQty) || 0, purchaseUnit as PurchaseUnit, Number(purchaseUnitSize) || 1);
                      const cost       = cpu * consume;
                      const profit     = price - cost;

                      if (!price || !cpu) return null;

                      return (
                        <div className="mt-3 pt-3 border-t border-slate-700/40 flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            Bénéfice estimé / vente
                          </span>
                          <span className={cn(
                            "font-bold",
                            profit > 0  ? "text-emerald-400"
                            : profit < 0 ? "text-red-400"
                            : "text-slate-400",
                          )}>
                            {profit > 0 ? "+" : ""}{formatMoney(profit)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Création en cours…</>
              : <><Package className="w-4 h-4" /> Créer le produit</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}