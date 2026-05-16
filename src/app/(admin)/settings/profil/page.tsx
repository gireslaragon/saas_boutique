import type { Metadata } from "next";
import { getProfileAction } from "@/actions/profile/profile.action";
import { ProfileFormClient } from "./_components/profile-form";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Mon profil" };
export const revalidate = 0;

export default async function ProfilPage() {
  const res = await getProfileAction();
  if (!res.success) redirect("/login");

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Mon profil</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Gérez vos informations personnelles et votre sécurité
        </p>
      </div>
      <ProfileFormClient user={res.data} />
    </div>
  );
}
