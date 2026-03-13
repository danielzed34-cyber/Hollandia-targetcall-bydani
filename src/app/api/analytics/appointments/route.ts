/**
 * GET /api/analytics/appointments
 *
 * Admin-only. Reads the Master Log Google Sheet and returns aggregated stats.
 * Accepts optional ?from=YYYY-MM-DD&to=YYYY-MM-DD query params.
 * Defaults to last 30 days when no params provided.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { getGoogleAuthClient } from "@/lib/google/auth";
import { MASTER_LOG_SHEET_ID, MASTER_LOG_TAB } from "@/config/external-links";

export const runtime = "nodejs";

function parseIsraelDate(raw: string): Date | null {
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function nDaysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function weekStartISO() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function monthStartISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const HEBREW_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"]; // Sun–Sat

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Period resolution
  const { searchParams } = request.nextUrl;
  const today = todayISO();
  const periodTo   = searchParams.get("to")   ?? today;
  const periodFrom = searchParams.get("from") ?? nDaysAgoISO(29);

  // Previous period of equal length for trend comparison
  const periodMs = new Date(periodTo).getTime() - new Date(periodFrom).getTime() + 86_400_000;
  const prevTo   = new Date(new Date(periodFrom).getTime() - 86_400_000).toISOString().split("T")[0];
  const prevFrom = new Date(new Date(periodFrom).getTime() - periodMs).toISOString().split("T")[0];

  try {
    const auth = await getGoogleAuthClient();
    const sheets = google.sheets({ version: "v4", auth: auth as never });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_LOG_SHEET_ID,
      range: `'${MASTER_LOG_TAB}'!A2:J`,
    });

    const rows = result.data.values ?? [];

    const weekStart  = weekStartISO();
    const monthStart = monthStartISO();

    let total = 0, countToday = 0, countWeek = 0, countMonth = 0;
    let periodCount = 0, prevTotal = 0;

    const byBranch: Record<string, number> = {};
    const byRep: Record<string, number> = {};
    const byDay: Record<string, number> = {}; // YYYY-MM-DD → count (period-scoped)
    const byWeekday = [0, 0, 0, 0, 0, 0, 0]; // Sun–Sat
    const activeDays = new Set<string>();

    for (const row of rows) {
      const timestampRaw = (row[0] as string) ?? "";
      const branch = (row[5] as string) ?? "לא ידוע";
      const rep    = (row[9] as string) ?? "לא ידוע";

      const date = parseIsraelDate(timestampRaw);
      if (!date) continue;

      const iso = date.toISOString().split("T")[0];
      total++;

      // Legacy fixed-window counters
      if (iso === today)      countToday++;
      if (iso >= weekStart)   countWeek++;
      if (iso >= monthStart)  countMonth++;

      // Period-scoped aggregation
      if (iso >= periodFrom && iso <= periodTo) {
        periodCount++;
        byBranch[branch] = (byBranch[branch] ?? 0) + 1;
        byRep[rep]       = (byRep[rep]       ?? 0) + 1;
        byDay[iso]       = (byDay[iso]        ?? 0) + 1;
        activeDays.add(iso);
        byWeekday[date.getUTCDay()]++;
      }

      // Previous period
      if (iso >= prevFrom && iso <= prevTo) {
        prevTotal++;
      }
    }

    // Derived stats
    const avgPerDay = activeDays.size > 0
      ? Math.round((periodCount / activeDays.size) * 10) / 10
      : 0;

    const topDay = Object.entries(byDay).reduce<{ date: string; count: number } | null>(
      (best, [d, c]) => (!best || c > best.count ? { date: d, count: c } : best),
      null
    );

    const activeRepCount = Object.keys(byRep).length;

    // Trend sorted chronologically (ISO strings sort lexicographically)
    const trend = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    const byWeekdayArr = byWeekday.map((count, i) => ({
      day: HEBREW_DAYS[i],
      count,
    }));

    const branchStats = Object.entries(byBranch)
      .sort(([, a], [, b]) => b - a)
      .map(([branch, count]) => ({ branch, count }));

    const repStats = Object.entries(byRep)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([rep, count]) => ({ rep, count }));

    return NextResponse.json({
      // Legacy (unchanged shape)
      total,
      countToday,
      countWeek,
      countMonth,
      // Period-scoped
      periodTotal: periodCount,
      prevTotal,
      avgPerDay,
      topDay,
      activeRepCount,
      byBranch: branchStats,
      byRep: repStats,
      trend,
      byWeekday: byWeekdayArr,
      periodFrom,
      periodTo,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[analytics/appointments]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
