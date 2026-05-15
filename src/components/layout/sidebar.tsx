"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Tag, Warehouse, Truck,
  AlertTriangle, BarChart2, Users, ShoppingBag,
  FileText, Settings, LogOut, ChevronLeft, ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import { logoutAction } from "@/actions/auth/logout.action";
import { cn } from "@/lib/utils/cn";
// import { cn } from "@/lib/utils/cn";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href:  "/dashboard",
    icon:  LayoutDashboard,
  },
  {
    label: "Produits",
    href:  "/produits",
    icon:  Package,
    separator: true,
  },
  { label: "Catégories",        href: "/categories",        icon: Tag },
  { label: "Stock",             href: "/stock",             icon: Warehouse },
  { label: "Approvisionnements",href: "/approvisionnements",icon: Truck },
  { label: "Pertes",            href: "/pertes",            icon: AlertTriangle, separator: true },
  { label: "Analytiques",       href: "/analytics",         icon: BarChart2 },
  { label: "Personnel",         href: "/personnel",         icon: Users, separator: true },
  { label: "Caisse",            href: "/caisse-admin",      icon: ShoppingCart },
  { label: "Factures",          href: "/factures",          icon: FileText },
  { label: "Paramètres",        href: "/settings",          icon: Settings, separator: true },
];

// ─── Composant ────────────────────────────────────────────────────────────────

interface SidebarProps {
  tenantName: string;
  tenantLogo?: string | null;
}

export function Sidebar({ tenantName, tenantLogo }: SidebarProps) {
  const pathname  = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logoutAction();
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-slate-900 border-r border-slate-800",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* ── Logo boutique ─────────────────────────────────────────────────── */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-slate-800",
        collapsed && "justify-center px-2"
      )}>
        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          {tenantLogo
            ? <img src={tenantLogo} alt={tenantName} className="w-8 h-8 rounded-lg object-cover" />
            : <ShoppingBag className="w-4 h-4 text-white" />
          }
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{tenantName}</p>
            <p className="text-xs text-slate-400">Patron</p>
          </div>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <div key={item.href}>
              {item.separator && !collapsed && (
                <div className="my-2 mx-2 border-t border-slate-800" />
              )}
              {item.separator && collapsed && <div className="my-2" />}

              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                  "transition-all duration-150 group",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <Icon className={cn(
                  "flex-shrink-0 w-4 h-4",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                )} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* ── Logout ────────────────────────────────────────────────────────── */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? "Déconnexion" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
            "text-slate-400 hover:text-red-400 hover:bg-red-400/10",
            "transition-all duration-150",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="flex-shrink-0 w-4 h-4" />
          {!collapsed && <span>{loggingOut ? "Déconnexion…" : "Déconnexion"}</span>}
        </button>
      </div>

      {/* ── Toggle collapse ───────────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={cn(
          "absolute -right-3 top-20",
          "w-6 h-6 rounded-full bg-slate-800 border border-slate-700",
          "flex items-center justify-center",
          "text-slate-400 hover:text-white hover:bg-slate-700",
          "transition-all duration-150 shadow-sm z-10"
        )}
        aria-label={collapsed ? "Déplier le menu" : "Réduire le menu"}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft  className="w-3 h-3" />
        }
      </button>
    </aside>
  );
}