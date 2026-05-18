"use client";

import Link from "next/link";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/formatters";

interface Notif {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function NotificationsDropdown() {

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [notifications, setNotifications] = useState<Notif[]>([]);

  const [unread, setUnread] = useState(0);

  async function fetchNotifications() {
    setLoading(true);

    try {

      const res = await fetch("/api/notifications");

      const json = await res.json();

      if (json.success) {
        setNotifications(json.data.notifications);
        setUnread(json.data.unreadCount ?? 0);
      }

    } catch {
      // ignore

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    (async () => {
      if (!mounted) return;
      await fetchNotifications();
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  // Listen for client-side notification events (created elsewhere) to update badge
  useEffect(() => {
    function onCreated() {
      setUnread((u) => u + 1);
      // If dropdown is open, refresh list
      if (open) fetchNotifications();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("notification:created", onCreated as EventListener);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("notification:created", onCreated as EventListener);
      }
    };
  }, [open]);

  async function markRead(id: string) {

    try {

      const res = await fetch(
        `/api/notifications/${id}`,
        {
          method: "POST",
        }
      );

      const json = await res.json();

      if (json.success) {

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id
              ? {
                  ...n,
                  readAt: new Date().toISOString(),
                }
              : n
          )
        );

        setUnread((u) => Math.max(0, u - 1));
      }

    } catch {
      // ignore
    }
  }

  return (
    <div className="relative">

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-4 h-4" />

        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />

          <div
            className={cn(
              "absolute right-2 top-full mt-1 z-20 w-80 md:w-96 max-w-[calc(100vw-1rem)]",
              "bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden"
            )}
          >

            <div className="px-3 py-2 border-b border-slate-700">
              <p className="text-xs font-medium text-white">
                Notifications
              </p>

              <p className="text-xs text-slate-400">
                {unread} non lue{unread !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto">

              {loading && (
                <div className="p-4 text-sm text-slate-400">
                  Chargement…
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-500">
                  Aucune notification
                </div>
              )}

              {!loading && notifications.map((n) => (

                <div
                  key={n.id}
                  className={cn(
                    "p-3 border-b border-slate-700/40 flex items-start gap-3",
                    !n.readAt && "bg-slate-700/20"
                  )}
                >

                  <div className="flex-1 min-w-0">

                    <div className="flex items-center justify-between gap-3">

                      <p
                        className={cn(
                          "text-sm font-semibold truncate",
                          n.readAt
                            ? "text-slate-300"
                            : "text-white"
                        )}
                      >
                        {n.title}
                      </p>

                      <p className="text-xs text-slate-500">
                        {formatDate(n.createdAt)}
                      </p>

                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      {n.message}
                    </p>

                    {!n.readAt && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Marquer lu
                      </button>
                    )}

                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 border-t border-slate-700 bg-slate-900/50">

              <Link
                href="/notifications"
                className="block text-center text-xs text-slate-400 hover:text-white"
              >
                Voir les notifications système
              </Link>

            </div>
          </div>
        </>
      )}
    </div>
  );
}