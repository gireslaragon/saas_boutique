import type { Metadata } from "next";
import { Bell, Info, AlertTriangle, Wrench, Sparkles, CreditCard } from "lucide-react";
import { getTenantNotificationsAction } from "@/actions/notifications/notifications.action";
import { formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Notifications" };
export const revalidate = 300;

const TYPE_CONFIG: Record<string, {
  label: string;
  icon:  React.ElementType;
  cls:   string;
  bg:    string;
}> = {
  info:        { label: "Info",        icon: Info,         cls: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  warning:     { label: "Important",   icon: AlertTriangle,cls: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  maintenance: { label: "Maintenance", icon: Wrench,       cls: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  feature:     { label: "Nouveauté",   icon: Sparkles,     cls: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  billing:     { label: "Facturation", icon: CreditCard,   cls: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20" },
};

export default async function NotificationsPage() {
  const res           = await getTenantNotificationsAction();
  const notifications = res.success ? res.data : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Messages de la plateforme Boutique SaaS
          </p>
        </div>
        {notifications.length > 0 && (
          <span className="px-2.5 py-1 bg-blue-600/20 text-blue-300 text-xs font-bold rounded-full border border-blue-500/20">
            {notifications.length} non lue{notifications.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-14 h-14 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">Aucune notification pour le moment</p>
          <p className="text-xs text-slate-500 mt-1">
            Les messages de la plateforme apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const cfg = TYPE_CONFIG[notif.notificationType] ?? TYPE_CONFIG.info;
            const Icon = cfg.icon;

            return (
              <div
                key={notif.id}
                className={cn(
                  "border rounded-2xl p-5 transition-colors",
                  cfg.bg
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                    "bg-slate-900/60"
                  )}>
                    <Icon className={cn("w-5 h-5", cfg.cls)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-semibold border",
                        cfg.bg, cfg.cls
                      )}>
                        {cfg.label}
                      </span>
                      <p className="text-sm font-semibold text-white">{notif.title}</p>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed">{notif.message}</p>

                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                      <span>{formatDate(notif.scheduledAt)}</span>
                      {notif.expiresAt && (
                        <>
                          <span>·</span>
                          <span>Expire le {formatDate(notif.expiresAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}