"use client";

import { cn } from "@/lib/utils/cn";
import { User } from "lucide-react";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";
import { useState } from "react";
// import { cn } from "@/lib/utils/cn";

interface NavbarProps {
  userName:  string;
  userEmail: string;
  pageTitle?: string;
}

export function Navbar({ userName, userEmail, pageTitle }: NavbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-14 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 flex items-center px-6 gap-4 sticky top-0 z-20">

      {/* Titre de page */}
      {pageTitle && (
        <h1 className="text-sm font-semibold text-white hidden md:block">
          {pageTitle}
        </h1>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications */}
      <NotificationsDropdown />

      {/* Avatar profil */}
      <div className="relative">
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-white leading-none">{userName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{userEmail}</p>
          </div>
        </button>

        {/* Dropdown */}
        {profileOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
            <div className={cn(
              "absolute right-0 top-full mt-1 w-48 z-20",
              "bg-slate-800 border border-slate-700 rounded-xl shadow-xl",
              "py-1 overflow-hidden"
            )}>
              <div className="px-3 py-2 border-b border-slate-700">
                <p className="text-xs font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
              </div>
              <a
                href="/settings/profil"
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                Mon profil
              </a>
            </div>
          </>
        )}
      </div>
    </header>
  );
}