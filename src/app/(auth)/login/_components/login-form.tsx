"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ShoppingBag } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validators/auth.schema";
import { loginAction } from "@/actions/auth/login.action";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    try {
      const result = await loginAction(data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Connexion réussie !");
      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      toast.error("Une erreur inattendue s'est produite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo & titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Boutique SaaS</h1>
          <p className="text-slate-400 mt-1 text-sm">Connectez-vous à votre espace</p>
        </div>

        {/* Carte du formulaire */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                className={`
                  w-full px-4 py-3 rounded-xl
                  bg-white/10 border text-white placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200
                  ${errors.email
                    ? "border-red-500/70 focus:ring-red-500"
                    : "border-white/10 hover:border-white/20"
                  }
                `}
                placeholder="patron@maboutique.cm"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Mot de passe
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                  className={`
                    w-full px-4 py-3 pr-11 rounded-xl
                    bg-white/10 border text-white placeholder-slate-500
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    transition-all duration-200
                    ${errors.password
                      ? "border-red-500/70 focus:ring-red-500"
                      : "border-white/10 hover:border-white/20"
                    }
                  `}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Bouton submit */}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full py-3 px-4 rounded-xl font-semibold text-white
                bg-blue-600 hover:bg-blue-500
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-200 shadow-lg shadow-blue-600/20
                flex items-center justify-center gap-2
                mt-2
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Vous n'avez pas de compte ?{" "}
          <a href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
            Créer votre boutique
          </a>
        </p>
      </div>
    </div>
  );
}
