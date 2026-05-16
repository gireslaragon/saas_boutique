"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Tag, Edit2, Check,
  X, Loader2, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  createCategoryAction,
  deleteCategoryAction,
} from "@/actions/settings/settings.action";

interface Category {
  id:        string;
  name:      string;
  color:     string | null;
  isDefault: boolean | null;
  sortOrder: number | null;
  _count?:   number; // nb produits
}

interface CategoriesShellProps {
  categories: Category[];
}

const PRESET_COLORS = [
  "#2E75B6", "#C0392B", "#E67E22", "#27AE60",
  "#8E44AD", "#16A085", "#D35400", "#2C3E50",
  "#E74C3C", "#3498DB", "#1ABC9C", "#F39C12",
];

export function CategoriesShell({ categories: initial }: CategoriesShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cats,     setCats]     = useState<Category[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [name,     setName]     = useState("");
  const [color,    setColor]    = useState("#2E75B6");
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function refresh() { startTransition(() => router.refresh()); }

  async function handleAdd() {
    if (!name.trim()) { toast.error("Nom requis"); return; }
    setSaving(true);
    const res = await createCategoryAction({ name: name.trim(), color });
    setSaving(false);
    if (!res.success) { toast.error(res.error); return; }
    setCats((prev) => [
      ...prev,
      { id: res.data!.id, name: name.trim(), color, isDefault: false, sortOrder: prev.length },
    ]);
    setName(""); setShowForm(false);
    toast.success("Catégorie créée");
    refresh();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await deleteCategoryAction(id);
    setDeleting(null);
    if (!res.success) { toast.error(res.error); return; }
    setCats((prev) => prev.filter((c) => c.id !== id));
    toast.success("Catégorie supprimée");
    refresh();
  }

  return (
    <div className="space-y-4">

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {cats.length} catégorie{cats.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle catégorie
        </button>
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <div className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Nouvelle catégorie</h3>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="Ex : Boissons fraîches, Snacks…"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Couleur</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110",
                    color === c ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              {/* Color picker personnalisé */}
              <label className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors" title="Couleur personnalisée">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="sr-only"
                />
                <span className="text-xs text-slate-400">+</span>
              </label>
            </div>
            {/* Aperçu */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-400">Aperçu :</span>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: color + "33", border: `1px solid ${color}66`, color }}
              >
                {name || "Nom de la catégorie"}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setShowForm(false); setName(""); }}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</> : "Créer"}
            </button>
          </div>
        </div>
      )}

      {/* Grille catégories */}
      {cats.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune catégorie</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cats.map((cat) => (
            <div
              key={cat.id}
              className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 flex items-center gap-3 group hover:border-slate-600/50 transition-colors"
            >
              {/* Couleur */}
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: (cat.color ?? "#2E75B6") + "33", border: `1px solid ${cat.color ?? "#2E75B6"}55` }}
              >
                <Tag className="w-4 h-4" style={{ color: cat.color ?? "#2E75B6" }} />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{cat.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {cat.isDefault && (
                    <span className="text-xs text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full">
                      Par défaut
                    </span>
                  )}
                  {cat._count !== undefined && (
                    <span className="text-xs text-slate-500">
                      {cat._count} produit{cat._count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Badge couleur + delete */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color ?? "#2E75B6" }}
                />
                {!cat.isDefault && (
                  <button
                    onClick={() => handleDelete(cat.id)}
                    disabled={deleting === cat.id}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                  >
                    {deleting === cat.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}