"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

interface GoalData {
  personalGoal: number | null;
  teamGoal: number | null;
  myCount: number;
}

export default function DashboardPage() {
  const { profile, role } = useAuth();
  const [dailyTip, setDailyTip] = useState<string | null>(null);
  const { appointmentsToday, complaintsToday } = useProductivityStore();
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [goalData, setGoalData] = useState<GoalData | null>(null);

  // Animation states
  const [apptPop, setApptPop] = useState(false);   // number pop on each new appointment
  const [apptFlash, setApptFlash] = useState(false); // green ring flash
  const [showCelebration, setShowCelebration] = useState(false); // goal reached overlay
  const prevAppts = useRef(appointmentsToday);
  const celebratedKey = useRef<string | null>(null);

  const fetchClockIn = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/clock");
      if (!res.ok) return;
      const data = await res.json() as { status: string; lastEvent: string | null };
      if (data.status === "clocked_in" && data.lastEvent) setClockInTime(data.lastEvent);
    } catch { /* non-critical */ }
  }, []);

  const fetchGoal = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      if (!res.ok) return;
      const data = await res.json() as GoalData;
      setGoalData(data);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetch("/api/daily-tip")
      .then((r) => r.json())
      .then((d: { tip: string | null }) => { if (d.tip) setDailyTip(d.tip); })
      .catch(() => {});
    void fetchClockIn();
    void fetchGoal();
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, [fetchClockIn, fetchGoal]);

  // ── Animation: trigger on each new appointment ─────────────
  useEffect(() => {
    if (appointmentsToday <= prevAppts.current) {
      prevAppts.current = appointmentsToday;
      return;
    }
    prevAppts.current = appointmentsToday;

    // Number pop animation
    setApptPop(true);
    setTimeout(() => setApptPop(false), 450);

    // Green flash ring
    setApptFlash(true);
    setTimeout(() => setApptFlash(false), 700);

    // Mini confetti burst
    import("canvas-confetti").then(({ default: confetti }) => {
      void confetti({
        particleCount: 10,
        spread: 50,
        origin: { x: 0.5, y: 0.35 },
        startVelocity: 25,
        gravity: 1.2,
        colors: ["#4FA8FF", "#34d399", "#fbbf24", "#f472b6"],
      });
    }).catch(() => {});
  }, [appointmentsToday]);

  // ── Animation: goal reached ─────────────────────────────────
  useEffect(() => {
    const goal = goalData?.personalGoal;
    if (!goal || appointmentsToday < goal) return;

    const today = new Date().toISOString().split("T")[0];
    const key = `goal_celebrated_${today}`;
    if (celebratedKey.current === key) return;

    // Check sessionStorage so we don't re-celebrate after refresh
    try {
      if (sessionStorage.getItem(key)) { celebratedKey.current = key; return; }
      sessionStorage.setItem(key, "1");
    } catch { /* ignore */ }
    celebratedKey.current = key;

    // Show overlay
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 4500);

    // Big confetti from both sides
    import("canvas-confetti").then(({ default: confetti }) => {
      void confetti({ particleCount: 120, spread: 75, origin: { x: 0.25, y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#ffffff", "#3b82f6"] });
      setTimeout(() => {
        void confetti({ particleCount: 120, spread: 75, origin: { x: 0.75, y: 0.5 }, colors: ["#10b981", "#34d399", "#ffffff", "#f472b6"] });
      }, 250);
    }).catch(() => {});
  }, [appointmentsToday, goalData]);

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

  const personalGoal = goalData?.personalGoal ?? null;
  const goalPct = personalGoal && personalGoal > 0
    ? Math.min(100, Math.round((appointmentsToday / personalGoal) * 100))
    : null;
  const goalReached = personalGoal !== null && appointmentsToday >= personalGoal;

  return (
    <div className="space-y-10 max-w-5xl">

      {/* ── Broadcast Modal ────────────────────────────────────── */}
      <BroadcastModal />

      {/* ── Goal Reached Celebration Overlay ──────────────────── */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          style={{ animation: "fadeInOut 4.5s ease forwards" }}
        >
          <div
            className="pointer-events-auto flex flex-col items-center gap-3 rounded-3xl px-10 py-8 text-center shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #0D2242 0%, #0A1530 100%)",
              border: "2px solid rgba(201,168,76,0.6)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(201,168,76,0.2)",
              animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            }}
            onClick={() => setShowCelebration(false)}
          >
            <div className="text-6xl">🏆</div>
            <p className="text-2xl font-black text-white">הגעת ליעד!</p>
            <p className="text-sm text-blue-200/70">
              כל הכבוד {firstName}! {appointmentsToday} פגישות היום
            </p>
            <p className="text-xs text-white/30 mt-1">לחץ לסגור</p>
          </div>
        </div>
      )}

      {/* ── Greeting ──────────────────────────────────────────── */}
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

      {/* ── Hero KPI Cards ────────────────────────────────────── */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">

        {/* KPI 1 — Appointments */}
        <div
          className="relative overflow-hidden rounded-3xl p-7 transition-all duration-500"
          style={{
            background: goalReached
              ? "linear-gradient(135deg, #0A1530 0%, #0D2242 100%)"
              : "linear-gradient(135deg, #0066E6 0%, #003DB5 100%)",
            boxShadow: goalReached
              ? apptFlash
                ? "0 20px 60px rgba(201,168,76,0.4), 0 0 0 2px rgba(201,168,76,0.6)"
                : "0 20px 60px rgba(201,168,76,0.25), 0 0 0 1px rgba(201,168,76,0.25)"
              : apptFlash
                ? "0 20px 60px rgba(52,211,153,0.35), 0 0 0 2px #34d399"
                : "0 20px 60px rgba(0,102,230,0.30), 0 0 0 1px rgba(255,255,255,0.10)",
            transition: "background 0.7s ease, box-shadow 0.4s ease",
          }}
        >
          {/* Gloss overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: goalReached
                ? "radial-gradient(ellipse at 80% 5%, rgba(201,168,76,0.18) 0%, transparent 60%)"
                : "radial-gradient(ellipse at 85% 10%, rgba(255,255,255,0.18) 0%, transparent 55%)",
            }}
          />

          {/* Background decorative icon */}
          <CalendarCheck
            className="pointer-events-none absolute bottom-3 end-3 h-20 w-20"
            strokeWidth={1}
            style={{ color: goalReached ? "rgba(201,168,76,0.10)" : "rgba(255,255,255,0.10)" }}
          />

          {/* Top row: label + badge */}
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ color: goalReached ? "rgba(201,168,76,0.65)" : "rgba(147,197,253,0.65)" }}
            >
              פגישות היום
            </p>
            {goalReached && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0"
                style={{
                  background: "rgba(201,168,76,0.15)",
                  color: "#C9A84C",
                  border: "1px solid rgba(201,168,76,0.35)",
                }}
              >
                🏆 יעד הושג!
              </span>
            )}
          </div>

          {/* Number with pop animation */}
          <div className="flex items-baseline gap-2 mt-1">
            <p
              className="text-7xl font-black tabular-nums leading-none tracking-tight"
              style={{
                transform: apptPop ? "scale(1.35)" : "scale(1)",
                transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                display: "inline-block",
                color: goalReached ? "#fbbf24" : "#ffffff",
                textShadow: goalReached ? "0 0 28px rgba(251,191,36,0.4)" : "none",
              }}
            >
              {appointmentsToday}
            </p>
            {personalGoal && (
              <span
                className="text-2xl font-bold"
                style={{ color: goalReached ? "rgba(201,168,76,0.45)" : "rgba(255,255,255,0.45)" }}
              >
                / {personalGoal}
              </span>
            )}
          </div>

          {/* Progress bar (only when goal is set) */}
          {goalPct !== null && (
            <div className="mt-3">
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.10)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${goalPct}%`,
                    background: goalReached
                      ? "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)"
                      : "linear-gradient(90deg, #60a5fa, #93c5fd)",
                    backgroundSize: goalReached ? "200% 100%" : "100% 100%",
                    animation: goalReached ? "shimmerBar 2.5s infinite linear" : "none",
                    transition: goalReached ? "none" : "width 0.6s ease",
                  }}
                />
              </div>
              {!goalReached && (
                <p className="mt-1 text-[10px] font-semibold" style={{ color: "rgba(147,197,253,0.5)" }}>
                  {goalPct}% מהיעד
                </p>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: goalReached ? "#C9A84C" : "#93c5fd" }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: goalReached ? "rgba(201,168,76,0.6)" : "rgba(147,197,253,0.6)" }}
            >
              פגישות מתואמות
            </span>
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

      {/* ── Daily Tip ─────────────────────────────────────────── */}
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

      {/* ── Pending Tasks ─────────────────────────────────────── */}
      <TaskWidget />

      {/* ── Quick Links ───────────────────────────────────────── */}
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

      {/* ── CSS Animations ────────────────────────────────────── */}
      <style>{`
        @keyframes fadeInOut {
          0%   { opacity: 0; }
          10%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes popIn {
          0%   { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes shimmerBar {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

    </div>
  );
}
