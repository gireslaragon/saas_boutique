import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-2xl mb-6">
          <ShieldX className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Accès refusé</h1>
        <p className="text-slate-400 mb-8">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
