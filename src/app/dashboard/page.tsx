"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useProductivityStore } from "@/stores/productivity-store";
import {
  CalendarPlus, Mic2, Clock, Bot, Headphones,
  MapPin, BarChart3, Lightbulb, CalendarCheck, AlertCircle, TrendingUp, ScrollText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TaskWidget } from "@/components/tasks/task-widget";
import { BroadcastModal } from "@/components/broadcasts/broadcast-modal";

const QUICK_LINKS = [
  { label: "תיאום פגישות", desc: "הוספת פגישה חדשה",     href: "/dashboard/crm",      icon: CalendarPlus, color: "text-blue-500",    bg: "bg-blue-500/10"    },
  { label: "משוב שיחה",    desc: "בקשת ניתוח שיחה",      href: "/dashboard/feedback", icon: Mic2,         color: "text-violet-500",  bg: "bg-violet-500/10"  },
  { label: "שעון נוכחות",  desc: "כניסה / יציאה",         href: "/dashboard/hr",       icon: Clock,        color: "text-emerald-500", bg: "bg-emerald-500/10" },
{ label: "מנטור AI",     desc: "שאל את המנטור",          href: "/dashboard/mentor",   icon: Bot,          color: "text-cyan-500",    bg: "bg-cyan-500/10"    },
  { label: "שירות לקוחות", desc: "פתיחת קריאת שירות",     href: "/dashboard/service",  icon: Headphones,   color: "text-rose-500",    bg: "bg-rose-500/10"    },
  { label: "מפת סניפים",   desc: "מצא את הסניף הקרוב",    href: "/dashboard/branches", icon: MapPin,       color: "text-orange-500",  bg: "bg-orange-500/10"  },
  { label: "תסריט שיחה",  desc: "בנה תסריט מותאם אישית",  href: "/dashboard/script",   icon: ScrollText,  color: "text-teal-500",    bg: "bg-teal-500/10"    },
  { label: "דוחות BI",     desc: "נתונים וסטטיסטיקות",    href: "/dashboard/analytics",icon: BarChart3,    color: "text-indigo-500",  bg: "bg-indigo-500/10", adminOnly: true },
];

export default function DashboardPage() {
  const { profile, role } = useAuth();
  const [dailyTip, setDailyTip] = useState<string | null>(null);
  const { appointmentsToday, complaintsToday } = useProductivityStore();
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const fetchClockIn = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/clock");
      if (!res.ok) return;
      const data = await res.json() as { status: string; lastEvent: string | null };
      if (data.status === "clocked_in" && data.lastEvent) setClockInTime(data.lastEvent);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetch("/api/daily-tip")
      .then((r) => r.json())
      .then((d: { tip: string | null }) => { if (d.tip) setDailyTip(d.tip); })
      .catch(() => {});
    void fetchClockIn();
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, [fetchClockIn]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "בוקר טוב";
    if (h < 17) return "צהריים טובים";
    return "ערב טוב";
  };

  void tick;
  const shiftDisplay = (() => {
    if (!clockInTime) return "--:--";
    const diff = Math.max(0, Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000));
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  })();

  const visible = QUICK_LINKS.filter((l) => !l.adminOnly || role === "Admin");
  const firstName = (profile?.nickname ?? profile?.full_name)?.split(" ")[0] ?? "";

  return (
    <div className="space-y-10 max-w-5xl">

      {/* ── Broadcast Modal (unread messages from admin) ──── */}
      <BroadcastModal />

      {/* ── Greeting ──────────────────────────────────────── */}
      <div>
        <h2 className="text-4xl font-black tracking-tight text-foreground">
          {greeting()},{" "}
          <span className="bg-gradient-to-l from-blue-500 to-blue-700 bg-clip-text text-transparent">
            {firstName}
          </span>
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          מה תרצה לעשות היום?
        </p>
      </div>

      {/* ── Hero KPI Cards ────────────────────────────────── */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">

        {/* KPI 1 — Appointments — vivid blue gradient */}
        <div
          className="relative overflow-hidden rounded-3xl p-7"
          style={{
            background: "linear-gradient(135deg, #0066E6 0%, #003DB5 100%)",
            boxShadow: "0 20px 60px rgba(0,102,230,0.30), 0 0 0 1px rgba(255,255,255,0.10)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 85% 10%, rgba(255,255,255,0.18) 0%, transparent 55%)",
            }}
          />
          <CalendarCheck
            className="pointer-events-none absolute bottom-3 end-3 h-24 w-24 text-white/10"
            strokeWidth={1}
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-200/60">
            פגישות היום
          </p>
          <p className="mt-2 text-7xl font-black text-white tabular-nums leading-none tracking-tight">
            {appointmentsToday}
          </p>
          <div className="mt-5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-300 shrink-0" />
            <span className="text-xs font-semibold text-blue-200/60">פגישות מתואמות</span>
          </div>
        </div>

        {/* KPI 2 — Service Calls */}
        <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-7 shadow-sm">
          <AlertCircle
            className="pointer-events-none absolute bottom-3 end-3 h-24 w-24 text-rose-500/[0.07]"
            strokeWidth={1}
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            קריאות שירות
          </p>
          <p className="mt-2 text-7xl font-black text-foreground tabular-nums leading-none tracking-tight">
            {complaintsToday}
          </p>
          <div className="mt-5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground">קריאות היום</span>
          </div>
        </div>

        {/* KPI 3 — Session Time */}
        <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-7 shadow-sm">
          <TrendingUp
            className="pointer-events-none absolute bottom-3 end-3 h-24 w-24 text-emerald-500/[0.07]"
            strokeWidth={1}
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            זמן פעילות
          </p>
          <p className="mt-2 text-6xl font-black text-foreground tabular-nums tracking-tight font-mono leading-none">
            {shiftDisplay}
          </p>
          <div className="mt-5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground">סשן פעיל</span>
          </div>
        </div>

      </div>

      {/* ── Daily Tip ─────────────────────────────────────── */}
      {dailyTip && (
        <div className="flex items-start gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 mt-0.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400 mb-1.5">
              טיפ היום
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">{dailyTip}</p>
          </div>
        </div>
      )}

      {/* ── Pending Tasks ─────────────────────────────────── */}
      <TaskWidget />

      {/* ── Quick Links ───────────────────────────────────── */}
      <div>
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          פעולות מהירות
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group">
                <div
                  className={cn(
                    "flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5",
                    "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    "hover:-translate-y-1 hover:shadow-xl hover:shadow-black/[0.08] hover:border-primary/20",
                    "dark:hover:shadow-black/40",
                    "cursor-pointer"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                      item.bg
                    )}
                  >
                    <Icon className={cn("h-5 w-5", item.color)} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-foreground leading-tight">
                      {item.label}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
