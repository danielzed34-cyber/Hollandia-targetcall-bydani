"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useAuth } from "@/contexts/auth-context";
import {
  LayoutDashboard, CalendarPlus, Mic2, Clock, Bot, Headphones,
  MapPin, BarChart3, ScrollText, MessageCircle, Users, Settings,
  CalendarClock, CheckSquare, Search, X,
} from "lucide-react";

interface CommandItem {
  label: string;
  href: string;
  icon: React.ElementType;
  keywords?: string;
  adminOnly?: boolean;
}

const ITEMS: CommandItem[] = [
  { label: "ראשי",             href: "/dashboard",                    icon: LayoutDashboard, keywords: "home dashboard" },
  { label: "תיאום פגישות",    href: "/dashboard/crm",                icon: CalendarPlus,    keywords: "crm appointments" },
  { label: "תזכורות",         href: "/dashboard/reminders",          icon: MessageCircle,   keywords: "reminders" },
  { label: "משוב שיחה",       href: "/dashboard/feedback",           icon: Mic2,            keywords: "feedback" },
  { label: "שעון נוכחות",     href: "/dashboard/hr",                 icon: Clock,           keywords: "hr attendance clock" },
  { label: "מנטור AI",        href: "/dashboard/mentor",             icon: Bot,             keywords: "mentor ai" },
  { label: "שירות לקוחות",    href: "/dashboard/service",            icon: Headphones,      keywords: "service complaints" },
  { label: "מפת סניפים",      href: "/dashboard/branches",           icon: MapPin,          keywords: "branches map" },
  { label: "תסריט שיחה",      href: "/dashboard/script",             icon: ScrollText,      keywords: "script call" },
  { label: "דוחות BI",        href: "/dashboard/analytics",          icon: BarChart3,       keywords: "analytics bi reports", adminOnly: true },
  { label: "ניהול משתמשים",   href: "/dashboard/admin/users",        icon: Users,           keywords: "users admin", adminOnly: true },
  { label: "נוכחות כולם",     href: "/dashboard/admin/hr",           icon: CalendarClock,   keywords: "attendance hr admin", adminOnly: true },
  { label: "אישור תסריטים",   href: "/dashboard/admin/scripts",      icon: CheckSquare,     keywords: "scripts admin", adminOnly: true },
  { label: "סידור עבודה",     href: "/dashboard/admin/shifts",       icon: CalendarClock,   keywords: "shifts admin", adminOnly: true },
  { label: "משימות והודעות",  href: "/dashboard/admin/tasks",        icon: CheckSquare,     keywords: "tasks broadcasts admin", adminOnly: true },
  { label: "הגדרות מנטור",    href: "/dashboard/admin/settings",     icon: Settings,        keywords: "settings mentor admin", adminOnly: true },
  { label: "WhatsApp",        href: "/dashboard/admin/whatsapp",     icon: MessageCircle,   keywords: "whatsapp admin", adminOnly: true },
  { label: "בקשות הרשמה",    href: "/dashboard/admin/registrations",icon: Users,           keywords: "registrations admin", adminOnly: true },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { role } = useAuth();

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key === "h") {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  function navigate(href: string) {
    setOpen(false);
    setSearch("");
    router.push(href);
  }

  const visible = ITEMS.filter((item) => !item.adminOnly || role === "Admin");

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => { setOpen(false); setSearch(""); }}
      />

      {/* Panel */}
      <div
        className="fixed left-1/2 top-[20vh] z-50 w-full max-w-lg -translate-x-1/2 rounded-2xl shadow-2xl"
        style={{
          background: "rgba(8,16,36,0.97)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.12)",
        }}
      >
        <Command shouldFilter>
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
            <Search className="h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="חפש דף או פעולה..."
              autoFocus
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              style={{ direction: "rtl" }}
            />
            <button
              onClick={() => { setOpen(false); setSearch(""); }}
              className="rounded-md p-1 transition-colors hover:bg-white/[0.07]"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              לא נמצאו תוצאות
            </Command.Empty>

            <Command.Group heading={
              <span className="px-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.28)" }}>
                ניווט
              </span>
            }>
              {visible.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={`${item.label} ${item.keywords ?? ""}`}
                    onSelect={() => navigate(item.href)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-colors"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: "rgba(201,168,76,0.85)" }} />
                    </div>
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>

          {/* Footer hint */}
          <div
            className="flex items-center justify-center gap-3 border-t border-white/[0.07] px-4 py-2.5"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            <span className="text-[11px]">↑↓ ניווט</span>
            <span className="text-[11px]">Enter בחר</span>
            <span className="text-[11px]">Esc סגור</span>
          </div>
        </Command>
      </div>
    </>
  );
}
