"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Store, Save, Loader2, Tag, Plus,
  Trash2, Info, Receipt, Clock, Palette,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  updateSettingsAction,
  createCategoryAction,
  deleteCategoryAction,
  type SettingsInput,
} from "@/actions/settings/settings.action";
import type { Tenant } from "@/db/schema/tenants";
import { cn } from "@/lib/utils/cn";

const schema = z.object({
  name:                  z.string().min(2, "Nom requis"),
  slogan:                z.string().max(255).optional(),
  phone:                 z.string().max(30).optional(),
  address:               z.string().optional(),
  city:                  z.string().max(100).optional(),
  invoicePrefix:         z.string().min(1, "Préfixe requis").max(20),
  groupInvoiceThreshold: z.coerce.number().int().min(0),
  sessionTimeoutMinutes: z.coerce.number().int().min(5).max(480),
  currency:              z.string().default("FCFA"),
});

interface Category {
  id:        string;
  name:      string;
  color:     string | null;
  isDefault: boolean | null;
}

interface SettingsFormProps {
  tenant:     Tenant;
  categories: Category[];
}

const PRESET_COLORS = [
  "#2E75B6", "#C0392B", "#E67E22", "#27AE60",
  "#8E44AD", "#16A085", "#D35400", "#2C3E50",
];

export function SettingsForm({ tenant, categories: initialCategories }: SettingsFormProps) {
  const router   = useRouter();
  const [saving, setSaving]  = useState(false);
  const [cats,   setCats]    = useState<Category[]>(initialCategories);
  const [newCatName,  setNewCatName]  = useState("");
  const [newCatColor, setNewCatColor] = useState("#2E75B6");
  const [addingCat,   setAddingCat]   = useState(false);
  const [activeTab,   setActiveTab]   = useState<"boutique" | "facturation" | "categories" | "securite">("boutique");

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<SettingsInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:                  tenant.name ?? "",
      slogan:                tenant.slogan ?? "",
      phone:                 tenant.phone ?? "",
      address:               tenant.address ?? "",
      city:                  tenant.city ?? "",
      invoicePrefix:         tenant.invoicePrefix ?? "FAC",
      groupInvoiceThreshold: tenant.groupInvoiceThreshold ?? 500,
      sessionTimeoutMinutes: tenant.sessionTimeoutMinutes ?? 30,
      currency:              tenant.currency ?? "FCFA",
    },
  });

  async function onSubmit(data: SettingsInput) {
    setSaving(true);
    const res = await updateSettingsAction(data);
    setSaving(false);
    if (!res.success) { toast.error(res.error); return; }
    toast.success("Paramètres enregistrés");
    router.refresh();
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) { toast.error("Nom requis"); return; }
    setAddingCat(true);
    const res = await createCategoryAction({ name: newCatName.trim(), color: newCatColor });
    setAddingCat(false);
    if (!res.success) { toast.error(res.error); return; }
    setCats((prev) => [...prev, { id: res.data!.id, name: newCatName.trim(), color: newCatColor, isDefault: false }]);
    setNewCatName("");
    toast.success("Catégorie créée");
  }

  async function handleDeleteCategory(catId: string) {
    const res = await deleteCategoryAction(catId);
    if (!res.success) { toast.error(res.error); return; }
    setCats((prev) => prev.filter((c) => c.id !== catId));
    toast.success("Catégorie supprimée");
  }

  const TABS = [
    { key: "boutique",    label: "Boutique",     icon: Store },
    { key: "facturation", label: "Facturation",  icon: Receipt },
    { key: "categories",  label: "Catégories",   icon: Tag },
    { key: "securite",    label: "Sécurité",     icon: Clock },
  ] as const;

  return (
    <div className="max-w-2xl">
      {/* Onglets */}
      <div className="flex gap-1 mb-6 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              activeTab === key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ── Onglet Boutique ─────────────────────────────────────────────── */}
        {activeTab === "boutique" && (
          <Section title="Informations de la boutique" icon={Store}>
            <Field label="Nom de la boutique *" error={errors.name?.message}>
              <input {...register("name")} className="settings-input" placeholder="Boutique Chez Maman" />
            </Field>
            <Field label="Slogan" hint="Apparaît sur les factures">
              <input {...register("slogan")} className="settings-input" placeholder="La qualité au meilleur prix !" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Téléphone">
                <input {...register("phone")} className="settings-input" placeholder="+237 6XX XXX XXX" />
              </Field>
              <Field label="Ville">
                <input {...register("city")} className="settings-input" placeholder="Yaoundé" />
              </Field>
            </div>
            <Field label="Adresse / Emplacement">
              <input {...register("address")} className="settings-input" placeholder="Quartier, Rue…" />
            </Field>
          </Section>
        )}

        {/* ── Onglet Facturation ──────────────────────────────────────────── */}
        {activeTab === "facturation" && (
          <Section title="Configuration des factures" icon={Receipt}>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Préfixe de facture *"
                hint="Ex: FAC → FAC-2026-00001"
                error={errors.invoicePrefix?.message}
              >
                <input {...register("invoicePrefix")} className="settings-input" placeholder="FAC" />
              </Field>
              <Field label="Devise">
                <input {...register("currency")} className="settings-input" placeholder="FCFA" />
              </Field>
            </div>
            <Field
              label="Seuil facture groupée (FCFA)"
              hint="Achats inférieurs à ce montant rejoignent la facture groupée du jour"
              error={errors.groupInvoiceThreshold?.message}
            >
              <input
                type="number"
                {...register("groupInvoiceThreshold")}
                className="settings-input"
                min="0"
              />
            </Field>
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300">
                  Exemple : seuil à 500 FCFA → un achat de biscuit à 100 FCFA sera ajouté
                  à la facture collective de la journée au lieu de créer sa propre facture.
                </p>
              </div>
            </div>
          </Section>
        )}

        {/* ── Onglet Sécurité ─────────────────────────────────────────────── */}
        {activeTab === "securite" && (
          <Section title="Paramètres de sécurité" icon={Clock}>
            <Field
              label="Délai d'inactivité caissière (minutes)"
              hint="La caissière est déconnectée automatiquement après ce délai d'inactivité"
              error={errors.sessionTimeoutMinutes?.message}
            >
              <input
                type="number"
                {...register("sessionTimeoutMinutes")}
                className="settings-input"
                min="5"
                max="480"
              />
            </Field>
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Recommandé : 15-30 minutes. Maximum : 8 heures (480 min).
                  Cette mesure protège la caisse en cas d&apos;oubli de déconnexion.
                </p>
              </div>
            </div>
          </Section>
        )}

        {/* Bouton sauvegarder (pas pour catégories) */}
        {activeTab !== "categories" && (
          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
          </div>
        )}
      </form>

      {/* ── Onglet Catégories (hors form) ───────────────────────────────── */}
      {activeTab === "categories" && (
        <Section title="Catégories de produits" icon={Tag}>
          {/* Liste */}
          <div className="space-y-2">
            {cats.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-700/40 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: cat.color ?? undefined }}
                  />
                  <span className="text-sm text-white">{cat.name}</span>
                  {cat.isDefault && (
                    <span className="text-xs text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full">
                      Par défaut
                    </span>
                  )}
                </div>
                {!cat.isDefault && (
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Ajout nouvelle catégorie */}
          <div className="mt-4 p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nouvelle catégorie
            </p>
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="settings-input"
              placeholder="Ex: Boissons fraîches…"
            />
            {/* Couleurs preset */}
            <div>
              <p className="text-xs text-slate-400 mb-2">Couleur</p>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCatColor(color)}
                    className={cn(
                      "w-7 h-7 rounded-lg border-2 transition-all",
                      newCatColor === color ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0"
                  title="Couleur personnalisée"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={addingCat || !newCatName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {addingCat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Ajouter
            </button>
          </div>
        </Section>
      )}

      <style jsx>{`
        .settings-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: rgb(30 41 59 / 0.8);
          border: 1px solid rgb(51 65 85 / 0.7);
          border-radius: 0.625rem;
          color: white;
          font-size: 0.8125rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .settings-input:focus { border-color: rgb(59 130 246 / 0.6); }
      `}</style>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, error, children }: {
  label:     string;
  hint?:     string;
  error?:    string;
  children:  React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
      {hint  && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}