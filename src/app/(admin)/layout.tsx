// import { redirect } from "next/navigation";
// import { requireAdmin } from "@/lib/auth/role-guards";
// import { db } from "@/db";
// import { tenants } from "@/db/schema/tenants";
// import { users } from "@/db/schema/users";
// import { eq } from "drizzle-orm";
// import { Sidebar } from "@/components/layout/sidebar";
// import { Navbar }  from "@/components/layout/navbar";

// export default async function AdminLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const auth = await requireAdmin();

//   // Charge tenant + user en parallèle
//   const [tenant, user] = await Promise.all([
//     db.select({ name: tenants.name, logoUrl: tenants.logoUrl })
//       .from(tenants)
//       .where(eq(tenants.id, auth.tenantId))
//       .limit(1)
//       .then((r) => r[0] ?? null),

//     db.select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
//       .from(users)
//       .where(eq(users.id, auth.id))
//       .limit(1)
//       .then((r) => r[0] ?? null),
//   ]);

//   if (!tenant || !user) redirect("/login");

//   const userName = `${user.firstName} ${user.lastName}`;

//   return (
//     <div className="flex h-screen bg-slate-950 overflow-hidden">
//       <Sidebar tenantName={tenant.name} tenantLogo={tenant.logoUrl} />

//       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
//         <Navbar userName={userName} userEmail={user.email} />

//         <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }



import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/role-guards";
import { db } from "@/db";
import { tenants } from "@/db/schema/tenants";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar }  from "@/components/layout/navbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();

  // Charge tenant + user en parallèle
  const [tenant, user] = await Promise.all([
    db.select({ name: tenants.name, logoUrl: tenants.logoUrl })
      .from(tenants)
      .where(eq(tenants.id, auth.tenantId))
      .limit(1)
      .then((r) => r[0] ?? null),

    db.select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.id, auth.id))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  if (!tenant || !user) redirect("/login");

  const userName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar tenantName={tenant.name} tenantLogo={tenant.logoUrl} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar userName={userName} userEmail={user.email} />

        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}