/**
 * GET /api/admin/hr/breaks
 *
 * Returns break-time statistics per rep.
 * Supports ?period=today|week|month (default: today)
 *
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function periodStart(period: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";

  const todayISO = `${get("year")}-${get("month")}-${get("day")}`;

  if (period === "today") {
    return `${todayISO}T00:00:00+03:00`;
  }

  if (period === "week") {
    // Last 7 days
    const d = new Date();
    d.setDate(d.getDate() - 6);
    const wFmt = fmt.formatToParts(d);
    const wGet = (t: string) => wFmt.find((p) => p.type === t)?.value ?? "00";
    return `${wGet("year")}-${wGet("month")}-${wGet("day")}T00:00:00+03:00`;
  }

  // month — last 30 days
  const d = new Date();
  d.setDate(d.getDate() - 29);
  const mFmt = fmt.formatToParts(d);
  const mGet = (t: string) => mFmt.find((p) => p.type === t)?.value ?? "00";
  return `${mGet("year")}-${mGet("month")}-${mGet("day")}T00:00:00+03:00`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const period = request.nextUrl.searchParams.get("period") ?? "today";
  const since = periodStart(period);

  const db = createAdminClient();

  // Fetch breaks and profiles in parallel
  const [{ data, error }, { data: profiles }] = await Promise.all([
    db
      .from("active_breaks")
      .select("user_id, started_at, ends_at")
      .gte("started_at", since)
      .order("started_at", { ascending: false }),
    db
      .from("profiles")
      .select("id, full_name, nickname"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build display-name lookup: always prefer nickname over full_name
  const nameById: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameById[p.id] = (p.nickname ?? p.full_name) as string;
  }

  // Aggregate per rep
  const repMap = new Map<string, { name: string; totalMinutes: number; breakCount: number }>();
  const now = Date.now();

  for (const row of data ?? []) {
    const start = new Date(row.started_at).getTime();
    const end = Math.min(new Date(row.ends_at).getTime(), now);
    const minutes = Math.max(0, Math.round((end - start) / 60000));

    const key = row.user_id;
    if (!repMap.has(key)) {
      repMap.set(key, { name: nameById[key] ?? "נציג", totalMinutes: 0, breakCount: 0 });
    }
    const entry = repMap.get(key)!;
    entry.totalMinutes += minutes;
    entry.breakCount += 1;
  }

  const byRep = Array.from(repMap.values())
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  return NextResponse.json({ byRep, period });
}
