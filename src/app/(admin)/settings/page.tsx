import type { Metadata } from "next";
import { SettingsForm } from "./_components/settings-form";
import { getSettingsAction } from "@/actions/settings/settings.action";
import { getCategoriesAction } from "@/actions/products/get-products.action";

export const metadata: Metadata = { title: "Paramètres" };
export const revalidate = 0;

export default async function SettingsPage() {
  const [settingsRes, categoriesRes] = await Promise.all([
    getSettingsAction(),
    getCategoriesAction(),
  ]);

  const tenant     = settingsRes.success   ? settingsRes.data   : null;
  const categories = categoriesRes.success ? categoriesRes.data : [];

  if (!tenant) {
    return (
      <div className="max-w-7xl mx-auto">
        <p className="text-red-400">Erreur chargement paramètres</p>
      </div>
    );
  }

  // Récupère aussi is_default pour les catégories
  const catsWithDefault = await (async () => {
    const { db } = await import("@/db");
    const { categories: catsTable } = await import("@/db/schema/categories");
    const { eq } = await import("drizzle-orm");
    return db
      .select({ id: catsTable.id, name: catsTable.name, color: catsTable.color, isDefault: catsTable.isDefault })
      .from(catsTable)
      .where(eq(catsTable.tenantId, tenant.id));
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Paramètres</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Configurez votre boutique, vos factures et vos catégories
        </p>
      </div>

      <SettingsForm tenant={tenant} categories={catsWithDefault} />
    </div>
  );
}