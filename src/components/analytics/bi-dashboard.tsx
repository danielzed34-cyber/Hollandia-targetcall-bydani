"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  CalendarCheck, TrendingUp, TrendingDown, Users,
  BarChart3, Coffee, Database, Star, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface PeriodRange { from: string; to: string }

interface AppointmentStats {
  total: number;
  countToday: number;
  countWeek: number;
  countMonth: number;
  periodTotal: number;
  prevTotal: number;
  avgPerDay: number;
  topDay: { date: string; count: number } | null;
  activeRepCount: number;
  byBranch: { branch: string; count: number }[];
  byRep: { rep: string; count: number }[];
  trend: { date: string; count: number }[];
  byWeekday: { day: string; count: number }[];
  periodFrom: string;
  periodTo: string;
}

interface BreakRepStat {
  name: string;
  totalMinutes: number;
  breakCount: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#7c3aed",
  "#4f46e5", "#c084fc", "#9333ea", "#a855f7",
  "#818cf8", "#d946ef",
];

const BREAK_PERIODS = [
  { value: "today", label: "היום" },
  { value: "week",  label: "7 ימים" },
  { value: "month", label: "30 ימים" },
];

function isoToday() {
  return new Date().toISOString().split("T")[0];
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const TODAY = isoToday();

const PERIOD_PRESETS = [
  { label: "היום",      from: TODAY,          to: TODAY },
  { label: "7 ימים",    from: daysAgo(6),     to: TODAY },
  { label: "החודש",     from: monthStart(),   to: TODAY },
  { label: "30 ימים",   from: daysAgo(29),    to: TODAY },
  { label: "90 ימים",   from: daysAgo(89),    to: TODAY },
  { label: "שנה",     from: daysAgo(364),  to: TODAY },
  { label: "הכל",     from: "2020-01-01",  to: TODAY },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTrendDate(iso: string): string {
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

function fmtDate(iso: string): string {
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : iso;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted/60", className)} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Skeleton className="h-8 w-28" />
        <div className="flex gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-16" />)}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: "Google Sheets" | "Supabase" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Database className="h-2.5 w-2.5" />
      {source}
    </span>
  );
}

function TrendBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0) return null;
  const pct = Math.round(((current - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
      up
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : "bg-red-500/10 text-red-600 dark:text-red-400"
    )}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}

function KpiCard({
  title, value, prev, icon: Icon, sub, accent = "indigo",
}: {
  title: string;
  value: number | string;
  prev?: number;
  icon: React.ElementType;
  sub?: string;
  accent?: "indigo" | "violet" | "purple" | "blue";
}) {
  const accentCls = {
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    blue:   "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  }[accent];

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", accentCls)}>
            <Icon className="h-5 w-5" />
          </div>
          {typeof prev === "number" && (
            <TrendBadge current={typeof value === "number" ? value : 0} prev={prev} />
          )}
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{value}</p>
        <p className="text-sm font-medium text-foreground/70 mt-0.5">{title}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active, payload, label, unit = "פגישות",
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-foreground">{label}</p>
      <p className="tabular-nums text-primary">{payload[0].value} {unit}</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function BIDashboard() {
  const [period, setPeriod]         = useState<PeriodRange>(PERIOD_PRESETS[2]);
  const [stats, setStats]           = useState<AppointmentStats | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [updatedAt, setUpdatedAt]   = useState<Date | null>(null);

  const [breakStats, setBreakStats]     = useState<BreakRepStat[]>([]);
  const [breakPeriod, setBreakPeriod]   = useState("today");
  const [breakLoading, setBreakLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/appointments?from=${period.from}&to=${period.to}`);
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      const data = await res.json() as AppointmentStats;
      setStats(data);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  }, [period]);

  const loadBreaks = useCallback(async (p: string) => {
    setBreakLoading(true);
    try {
      const res = await fetch(`/api/admin/hr/breaks?period=${p}`);
      if (res.ok) {
        const data = await res.json() as { byRep: BreakRepStat[] };
        setBreakStats(data.byRep);
      }
    } finally {
      setBreakLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadBreaks(breakPeriod); }, [loadBreaks, breakPeriod]);

  function exportCSV() {
    if (!stats) return;
    const periodLabel = PERIOD_PRESETS.find(
      (p) => p.from === period.from && p.to === period.to
    )?.label ?? `${period.from} – ${period.to}`;

    const lines: string[] = [];
    // BOM for Excel Hebrew support
    const bom = "\uFEFF";

    lines.push(`דוח Analytics — ${periodLabel}`);
    lines.push(`סה"כ פגישות,${stats.periodTotal}`);
    lines.push(`ממוצע יומי,${stats.avgPerDay}`);
    lines.push(`נציגים פעילים,${stats.activeRepCount}`);
    lines.push("");

    lines.push("סניף,פגישות");
    stats.byBranch.forEach((b) => lines.push(`${b.branch},${b.count}`));
    lines.push("");

    lines.push("נציג,פגישות");
    stats.byRep.forEach((r) => lines.push(`${r.rep},${r.count}`));
    lines.push("");

    lines.push("תאריך,פגישות");
    stats.trend.forEach((t) => lines.push(`${t.date},${t.count}`));

    const csv = bom + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${period.from}_${period.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalBranch = useMemo(
    () => Math.max(1, stats?.byBranch.reduce((s, b) => s + b.count, 0) ?? 1),
    [stats]
  );
  const totalRep = useMemo(
    () => Math.max(1, stats?.byRep.reduce((s, r) => s + r.count, 0) ?? 1),
    [stats]
  );

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const activePeriodLabel = PERIOD_PRESETS.find(
    (p) => p.from === period.from && p.to === period.to
  )?.label;

  return (
    <div className="space-y-6">

      {/* ── Period Selector ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">דוחות BI</h1>
          {updatedAt && (
            <p suppressHydrationWarning className="text-xs text-muted-foreground mt-0.5">
              עודכן: {updatedAt.toLocaleTimeString("he-IL")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            disabled={!stats}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            ייצוא CSV
          </button>
          <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          {PERIOD_PRESETS.map((p) => {
            const isActive = p.from === period.from && p.to === period.to;
            return (
              <button
                key={p.label}
                onClick={() => setPeriod({ from: p.from, to: p.to })}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                )}
              >
                {p.label}
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="סה״כ פגישות"
          value={stats.periodTotal}
          prev={stats.prevTotal}
          icon={CalendarCheck}
          sub={`מתוך ${stats.total} סה״כ`}
          accent="indigo"
        />
        <KpiCard
          title="ממוצע יומי"
          value={stats.avgPerDay}
          icon={BarChart3}
          sub={stats.topDay
            ? `שיא: ${stats.topDay.count} ב-${fmtDate(stats.topDay.date)}`
            : undefined}
          accent="violet"
        />
        <KpiCard
          title="נציגים פעילים"
          value={stats.activeRepCount}
          icon={Users}
          sub={stats.byRep[0] ? `מוביל: ${stats.byRep[0].rep}` : undefined}
          accent="purple"
        />
        <KpiCard
          title="הסניף המוביל"
          value={stats.byBranch[0]?.branch ?? "—"}
          icon={Star}
          sub={stats.byBranch[0]
            ? `${stats.byBranch[0].count} פגישות (${Math.round((stats.byBranch[0].count / totalBranch) * 100)}%)`
            : undefined}
          accent="blue"
        />
      </div>

      {/* ── Trend — AreaChart ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm">מגמת פגישות</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {activePeriodLabel ?? `${fmtDate(period.from)} – ${fmtDate(period.to)}`}
                {" · "}
                {stats.trend.length} ימים פעילים
              </CardDescription>
            </div>
            <SourceBadge source="Google Sheets" />
          </div>
        </CardHeader>
        <CardContent>
          {stats.trend.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              אין נתונים לתקופה זו
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={248}>
              <AreaChart data={stats.trend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.08} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatTrendDate}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#trendGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#6366f1" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Row 2: Branch + Rep Leaderboard ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Branch Performance */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">ביצועי סניפים</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {stats.byBranch.length} סניפים פעילים
                </CardDescription>
              </div>
              <SourceBadge source="Google Sheets" />
            </div>
          </CardHeader>
          <CardContent>
            {stats.byBranch.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                אין נתונים
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, stats.byBranch.length * 34)}>
                <BarChart
                  data={stats.byBranch}
                  layout="vertical"
                  margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="branch" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.byBranch.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Rep Leaderboard */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">מובילי ביצועים</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  נציגים לפי מספר פגישות
                </CardDescription>
              </div>
              <SourceBadge source="Google Sheets" />
            </div>
          </CardHeader>
          <CardContent>
            {stats.byRep.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                אין נתונים
              </div>
            ) : (
              <div className="space-y-3">
                {stats.byRep.slice(0, 8).map((r, i) => {
                  const pct = Math.round((r.count / totalRep) * 100);
                  return (
                    <div key={r.rep}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            i === 0 ? "bg-amber-400/20 text-amber-600"
                            : i === 1 ? "bg-slate-400/20 text-slate-500"
                            : i === 2 ? "bg-orange-400/20 text-orange-600"
                            : "bg-muted text-muted-foreground"
                          )}>
                            {i + 1}
                          </span>
                          <span className="font-medium truncate">{r.rep}</span>
                        </div>
                        <span className="tabular-nums text-muted-foreground shrink-0">
                          {r.count}{" "}
                          <span className="opacity-60">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Weekday Distribution + Breaks ────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Weekday Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">פיזור לפי יום בשבוע</CardTitle>
            <CardDescription className="text-xs">
              אילו ימים הכי פרודוקטיביים
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={stats.byWeekday}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.byWeekday.map((entry, i) => {
                    const max = Math.max(...stats.byWeekday.map((d) => d.count), 1);
                    const opacity = 0.35 + (entry.count / max) * 0.65;
                    return <Cell key={i} fill="#8b5cf6" fillOpacity={opacity} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Break Overview */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Coffee className="h-4 w-4" />
                  הפסקות לפי נציג
                </CardTitle>
                <CardDescription className="text-xs">דקות הפסקה בתקופה</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <SourceBadge source="Supabase" />
                <div className="flex gap-1">
                  {BREAK_PERIODS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setBreakPeriod(p.value)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        breakPeriod === p.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {breakLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : breakStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                אין נתוני הפסקות לתקופה זו
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.min(breakStats.length * 36 + 8, 200)}>
                  <BarChart
                    data={breakStats}
                    layout="vertical"
                    margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10 }} unit=" דק'" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={72} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row = breakStats.find((r) => r.name === label);
                        return (
                          <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                            <p className="font-medium mb-0.5">{label}</p>
                            <p>{payload[0].value} דקות · {row?.breakCount ?? 0} הפסקות</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="totalMinutes" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-center">
                  <div>
                    <p className="text-lg font-bold tabular-nums">
                      {breakStats.reduce((s, r) => s + r.breakCount, 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">סה״כ הפסקות</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold tabular-nums">
                      {breakStats.reduce((s, r) => s + r.totalMinutes, 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">סה״כ דקות</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold tabular-nums">
                      {Math.round(
                        breakStats.reduce((s, r) => s + r.totalMinutes, 0) /
                        Math.max(1, breakStats.length)
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">ממוצע לנציג</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
