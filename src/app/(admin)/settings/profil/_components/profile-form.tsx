"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, KeyRound, Save, Loader2, Shield, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateProfileAction, changePasswordAction } from "@/actions/profile/profile.action";
import { formatDateTime, formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

const profileSchema = z.object({
  firstName: z.string().min(2, "Prénom trop court"),
  lastName:  z.string().min(2, "Nom trop court"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Requis"),
  newPassword:     z.string().min(8, "Au moins 8 caractères")
                     .regex(/[A-Z]/, "Une majuscule requise")
                     .regex(/[0-9]/, "Un chiffre requis"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path:    ["confirmPassword"],
});

type ProfileForm   = z.infer<typeof profileSchema>;
type PasswordForm  = z.infer<typeof passwordSchema>;

interface ProfileFormProps {
  user: {
    id:          string;
    firstName:   string;
    lastName:    string;
    email:       string;
    role:        string;
    status:      string;
    hiredAt:     string;
    lastLoginAt: string | null;
  };
}

const ROLE_LABELS: Record<string, string> = {
  admin:   "Patron (Admin)",
  cashier: "Caissière",
};

export function ProfileFormClient({ user }: ProfileFormProps) {
  const router        = useRouter();
  const [tab, setTab] = useState<"infos" | "password">("infos");
  const [savingInfo,  setSavingInfo]  = useState(false);
  const [savingPwd,   setSavingPwd]   = useState(false);

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  // ── Formulaire infos ───────────────────────────────────────────────────────
  const infoForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user.firstName, lastName: user.lastName },
  });

  async function onSaveInfo(data: ProfileForm) {
    setSavingInfo(true);
    const res = await updateProfileAction(data);
    setSavingInfo(false);
    if (!res.success) { toast.error(res.error); return; }
    toast.success("Profil mis à jour");
    router.refresh();
  }

  // ── Formulaire mot de passe ────────────────────────────────────────────────
  const pwdForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  async function onChangePwd(data: PasswordForm) {
    setSavingPwd(true);
    const res = await changePasswordAction(data);
    setSavingPwd(false);
    if (!res.success) { toast.error(res.error); return; }
    toast.success("Mot de passe modifié — reconnectez-vous sur vos autres appareils");
    pwdForm.reset();
  }

  return (
    <div className="max-w-xl space-y-6">

      {/* Card identité */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-slate-400">{user.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="px-2.5 py-0.5 bg-blue-600/20 text-blue-300 text-xs font-medium rounded-full border border-blue-500/20">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <span className={cn(
                "px-2.5 py-0.5 text-xs font-medium rounded-full border",
                user.status === "active"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-slate-700 text-slate-400 border-slate-600"
              )}>
                {user.status === "active" ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Membre depuis</p>
              <p className="text-xs font-medium text-slate-300">{formatDate(user.hiredAt)}</p>
            </div>
          </div>
          {user.lastLoginAt && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Dernière connexion</p>
                <p className="text-xs font-medium text-slate-300">{formatDateTime(user.lastLoginAt)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 w-fit">
        {[
          { key: "infos",    label: "Informations", icon: User },
          { key: "password", label: "Mot de passe", icon: KeyRound },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as "infos" | "password")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors",
              tab === key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab infos ──────────────────────────────────────────────────────── */}
      {tab === "infos" && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Informations personnelles</h3>
          <form onSubmit={infoForm.handleSubmit(onSaveInfo)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Prénom *</label>
                <input
                  {...infoForm.register("firstName")}
                  className="profile-input"
                  placeholder="Marie"
                />
                {infoForm.formState.errors.firstName && (
                  <p className="text-xs text-red-400 mt-1">{infoForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom *</label>
                <input
                  {...infoForm.register("lastName")}
                  className="profile-input"
                  placeholder="Ondoua"
                />
                {infoForm.formState.errors.lastName && (
                  <p className="text-xs text-red-400 mt-1">{infoForm.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email — lecture seule */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <div className="profile-input opacity-60 cursor-not-allowed">{user.email}</div>
              <p className="text-xs text-slate-500 mt-1">
                L&apos;email ne peut pas être modifié ici. Contactez votre administrateur.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingInfo}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
            >
              {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingInfo ? "Enregistrement…" : "Sauvegarder"}
            </button>
          </form>
        </div>
      )}

      {/* ── Tab mot de passe ──────────────────────────────────────────────── */}
      {tab === "password" && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-white">Modifier le mot de passe</h3>
          </div>

          <form onSubmit={pwdForm.handleSubmit(onChangePwd)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Mot de passe actuel *
              </label>
              <input
                type="password"
                {...pwdForm.register("currentPassword")}
                className="profile-input"
                placeholder="••••••••"
              />
              {pwdForm.formState.errors.currentPassword && (
                <p className="text-xs text-red-400 mt-1">{pwdForm.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Nouveau mot de passe *
              </label>
              <input
                type="password"
                {...pwdForm.register("newPassword")}
                className="profile-input"
                placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
              />
              {pwdForm.formState.errors.newPassword && (
                <p className="text-xs text-red-400 mt-1">{pwdForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Confirmer *
              </label>
              <input
                type="password"
                {...pwdForm.register("confirmPassword")}
                className="profile-input"
                placeholder="Répétez le nouveau mot de passe"
              />
              {pwdForm.formState.errors.confirmPassword && (
                <p className="text-xs text-red-400 mt-1">{pwdForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <p className="text-xs text-amber-300">
                Après modification, vous serez déconnecté de tous vos autres appareils.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingPwd}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
            >
              {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {savingPwd ? "Modification…" : "Modifier le mot de passe"}
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        .profile-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: rgb(15 23 42 / 0.8);
          border: 1px solid rgb(51 65 85 / 0.8);
          border-radius: 0.625rem;
          color: white;
          font-size: 0.8125rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .profile-input:focus { border-color: rgb(59 130 246 / 0.6); }
      `}</style>
    </div>
  );
}
