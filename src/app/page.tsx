import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/auth/session";
import { verifyAccessToken, verifySuperAdminToken } from "@/lib/auth/jwt";

/**
 * Page racine — redirige selon l'état de connexion :
 * - Non connecté       → /login
 * - Admin (patron)     → /dashboard
 * - Caissière          → /caisse
 * - Super admin        → /super-admin/dashboard
 */
export default async function RootPage() {
  const token = await getAccessToken();

  if (!token) {
    redirect("/login");
  }

  const user = await verifyAccessToken(token);
  if (user) {
    redirect(user.role === "admin" ? "/dashboard" : "/caisse");
  }

  const superAdmin = await verifySuperAdminToken(token);
  if (superAdmin) {
    redirect("/super-admin/dashboard");
  }

  // Token invalide → login
  redirect("/login");
}
