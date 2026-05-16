"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus, MoreVertical, UserX, UserCheck,
  KeyRound, Search, Shield, ShieldOff, X, Loader2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { formatMoney, formatNumber, formatDate, formatDateTime } from "@/lib/utils/formatters";
import {
  addCashierAction,
  toggleCashierAction,
  resetCashierPasswordAction,
} from "@/actions/personnel/personnel.action";

interface Cashier {
  id:                 string;
  firstName:          string;
  lastName:           string;
  email:              string;
  status:             string;
  hiredAt:            string;
  deactivatedAt:      string | null;
  deactivationReason: string | null;
  lastLoginAt:        string | null;
  totalSales:         number;
  totalRevenue:       number;
}

interface PersonnelShellProps {
  cashiers: Cashier[];
}

// ── Schémas ─────────────────────────────────────────────────────────────────

const addSchema = z.object({
  firstName: z.string().min(2, "Prénom requis"),
  lastName:  z.string().min(2, "Nom requis"),
  email:     z.string().email("Email invalide"),
  password:  z.string().min(8, "Au moins 8 caractères"),
});

const pwdSchema = z.object({
  newPassword: z.string().min(8, "Au moins 8 caractères"),
  confirm:     z.string(),
}).refine((d) => d.newPassword === d.confirm, {
  message: "Les mots de passe ne correspondent pas",
  path:    ["confirm"],
});

// ── Composant ────────────────────────────────────────────────────────────────

export function PersonnelShell({ cashiers }: PersonnelShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search,     setSearch]      = useState("");
  const [showAdd,    setShowAdd]     = useState(false);
  const [menuOpen,   setMenuOpen]    = useState<string | null>(null);
  const [pwdFor,     setPwdFor]      = useState<Cashier | null>(null);
  const [deactFor,   setDeactFor]    = useState<Cashier | null>(null);
  const [deactReason, setDeactReason] = useState("");

  function refresh() { startTransition(() => router.refresh()); }

  const filtered = cashiers.filter(
    (c) =>
      `${c.firstName} ${c.lastName} ${c.email}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const active   = cashiers.filter((c) => c.status === "active").length;
  const inactive = cashiers.filter((c) => c.status !== "active").length;

  return (
    <div className="space-y-5">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" /> Ajouter caissière
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <span className="text-xs text-emerald-400 font-medium">{active} active{active !== 1 ? "s" : ""}</span>
        </div>
        {inactive > 0 && (
          <div className="px-4 py-2 bg-slate-700/40 border border-slate-600/30 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">{inactive} désactivée{inactive !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* ── Liste caissières ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <UserPlus className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aucune caissière trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const isActive  = c.status === "active";
            const initials  = `${c.firstName[0]}${c.lastName[0]}`.toUpperCase();
            const colors    = ["bg-blue-600", "bg-violet-600", "bg-emerald-600", "bg-amber-600"];
            const color     = colors[c.id.charCodeAt(0) % colors.length];

            return (
              <div
                key={c.id}
                className={cn(
                  "bg-slate-800/40 border rounded-2xl p-5 transition-colors",
                  isActive ? "border-slate-700/50" : "border-slate-700/30 opacity-70"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                    {initials}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-white">{c.firstName} {c.lastName}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium border",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-600/30 text-slate-400 border-slate-600/30"
                      )}>
                        {isActive ? "Active" : "Désactivée"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-3">{c.email}</p>

                    {/* Stats en grille */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Embauche</p>
                        <p className="text-xs font-medium text-slate-300">{formatDate(c.hiredAt)}</p>
                      </div>
                      {c.deactivatedAt && (
                        <div>
                          <p className="text-xs text-slate-500">Départ</p>
                          <p className="text-xs font-medium text-red-400">{formatDate(c.deactivatedAt)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500">Ventes totales</p>
                        <p className="text-xs font-medium text-slate-300">{formatNumber(c.totalSales)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">CA généré</p>
                        <p className="text-xs font-medium text-emerald-400">{formatMoney(c.totalRevenue)}</p>
                      </div>
                      {c.lastLoginAt && (
                        <div>
                          <p className="text-xs text-slate-500">Dernière connexion</p>
                          <p className="text-xs font-medium text-slate-300">{formatDateTime(c.lastLoginAt)}</p>
                        </div>
                      )}
                      {c.deactivationReason && (
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500">Motif départ</p>
                          <p className="text-xs text-slate-400 italic">&apos;{c.deactivationReason}&apos;</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Menu contextuel */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpen === c.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-full mt-1 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden py-1">
                          <button
                            onClick={() => { setPwdFor(c); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Réinitialiser mot de passe
                          </button>
                          {isActive ? (
                            <button
                              onClick={() => { setDeactFor(c); setMenuOpen(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            >
                              <ShieldOff className="w-3.5 h-3.5" /> Désactiver l&apos;accès
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                setMenuOpen(null);
                                const res = await toggleCashierAction({ cashierId: c.id, action: "reactivate" });
                                if (res.success) { toast.success("Accès réactivé"); refresh(); }
                                else toast.error(res.error);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                            >
                              <Shield className="w-3.5 h-3.5" /> Réactiver l&apos;accès
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ajout caissière ─────────────────────────────────────────── */}
      {showAdd && <AddCashierModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); refresh(); }} />}

      {/* ── Modal réinitialisation mot de passe ──────────────────────────── */}
      {pwdFor && <ResetPasswordModal cashier={pwdFor} onClose={() => setPwdFor(null)} onSuccess={() => { setPwdFor(null); toast.success("Mot de passe réinitialisé"); }} />}

      {/* ── Modal désactivation ───────────────────────────────────────────── */}
      {deactFor && (
        <DeactivateModal
          cashier={deactFor}
          onClose={() => setDeactFor(null)}
          onSuccess={() => { setDeactFor(null); refresh(); }}
        />
      )}
    </div>
  );
}

// ── Sub-modals ───────────────────────────────────────────────────────────────

function AddCashierModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof addSchema>>({
    resolver: zodResolver(addSchema),
  });

  async function onSubmit(data: z.infer<typeof addSchema>) {
    setLoading(true);
    const res = await addCashierAction(data);
    setLoading(false);
    if (!res.success) { toast.error(res.error); return; }
    toast.success("Caissière ajoutée !");
    onSuccess();
  }

  return (
    <Modal title="Ajouter une caissière" icon={<UserPlus className="w-4 h-4 text-white" />} iconBg="bg-blue-600" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom *" error={errors.firstName?.message}>
            <input {...register("firstName")} className="modal-input" placeholder="Marie" />
          </Field>
          <Field label="Nom *" error={errors.lastName?.message}>
            <input {...register("lastName")} className="modal-input" placeholder="Ondoua" />
          </Field>
        </div>
        <Field label="Email *" error={errors.email?.message}>
          <input {...register("email")} type="email" className="modal-input" placeholder="caissiere@boutique.cm" />
        </Field>
        <Field label="Mot de passe provisoire *" error={errors.password?.message}>
          <input {...register("password")} type="password" className="modal-input" placeholder="min. 8 caractères" />
        </Field>
        <Buttons loading={loading} onClose={onClose} submitLabel="Ajouter" />
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ cashier, onClose, onSuccess }: { cashier: Cashier; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof pwdSchema>>({
    resolver: zodResolver(pwdSchema),
  });

  async function onSubmit(data: z.infer<typeof pwdSchema>) {
    setLoading(true);
    const res = await resetCashierPasswordAction(cashier.id, data.newPassword);
    setLoading(false);
    if (!res.success) { toast.error(res.error); return; }
    onSuccess();
  }

  return (
    <Modal title={`Mot de passe — ${cashier.firstName}`} icon={<KeyRound className="w-4 h-4 text-white" />} iconBg="bg-amber-600" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Nouveau mot de passe *" error={errors.newPassword?.message}>
          <input {...register("newPassword")} type="password" className="modal-input" placeholder="min. 8 caractères" />
        </Field>
        <Field label="Confirmer *" error={errors.confirm?.message}>
          <input {...register("confirm")} type="password" className="modal-input" placeholder="Répétez le mot de passe" />
        </Field>
        <Buttons loading={loading} onClose={onClose} submitLabel="Réinitialiser" submitClass="bg-amber-600 hover:bg-amber-500" />
      </form>
    </Modal>
  );
}

function DeactivateModal({ cashier, onClose, onSuccess }: { cashier: Cashier; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [reason,  setReason]  = useState("");

  async function handleDeactivate() {
    setLoading(true);
    const res = await toggleCashierAction({ cashierId: cashier.id, action: "deactivate", reason: reason || undefined });
    setLoading(false);
    if (!res.success) { toast.error(res.error); return; }
    toast.success("Accès révoqué");
    onSuccess();
  }

  return (
    <Modal title={`Désactiver — ${cashier.firstName} ${cashier.lastName}`} icon={<ShieldOff className="w-4 h-4 text-white" />} iconBg="bg-red-600" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">Cette action révoque immédiatement l&apos;accès. Les données et l&apos;historique sont conservés.</p>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Motif (optionnel)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="modal-input resize-none"
            placeholder="Raison du départ…"
          />
        </div>
        <Buttons loading={loading} onClose={onClose} submitLabel="Confirmer la désactivation" submitClass="bg-red-600 hover:bg-red-500" onSubmit={handleDeactivate} />
      </div>
    </Modal>
  );
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

function Modal({ title, icon, iconBg, onClose, children }: { title: string; icon?: React.ReactNode; iconBg?: string; onClose: () => void; children?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>{icon}</div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
      <style jsx>{`
        .modal-input { width: 100%; padding: 0.625rem 0.875rem; background: rgb(30 41 59/0.8); border: 1px solid rgb(51 65 85/0.8); border-radius: 0.625rem; color: white; font-size: 0.8125rem; outline: none; }
        .modal-input:focus { border-color: rgb(59 130 246/0.6); }
      `}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function Buttons({ loading, onClose, submitLabel, submitClass = "bg-blue-600 hover:bg-blue-500", onSubmit }: { loading: boolean; onClose: () => void; submitLabel: string; submitClass?: string; onSubmit?: (() => void | Promise<void>) }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type={onSubmit ? "button" : "button"} onClick={onSubmit ?? undefined} className="hidden" />
      <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">Annuler</button>
      <button type={onSubmit ? "button" : "submit"} onClick={onSubmit} disabled={loading}
        className={`flex-1 py-2.5 rounded-xl ${submitClass} text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2`}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement…</> : submitLabel}
      </button>
    </div>
  );
}
