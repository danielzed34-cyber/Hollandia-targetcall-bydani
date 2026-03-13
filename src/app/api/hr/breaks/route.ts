/**
 * /api/hr/breaks
 *
 * GET    – active breaks + today's used/max minutes for caller
 * POST   – start a break  { durationMinutes: number }
 * DELETE – end own break early
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Midnight Israel time as ISO string — for "today" comparisons */
function todayStartISO(): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T00:00:00+03:00`;
}

/** Sum minutes of breaks (caps active breaks at current time) */
function sumBreakMinutes(rows: { started_at: string; ends_at: string }[]): number {
  const nowMs = Date.now();
  return rows.reduce((sum, b) => {
    const start = new Date(b.started_at).getTime();
    const end = Math.min(new Date(b.ends_at).getTime(), nowMs);
    return sum + Math.max(0, Math.round((end - start) / 60000));
  }, 0);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date().toISOString();

  const [
    { data: activeData, error },
    { data: todayBreaks },
    { data: settings },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("active_breaks")
      .select("id, user_id, started_at, ends_at")
      .gt("ends_at", now)
      .order("started_at", { ascending: false }),
    supabase
      .from("active_breaks")
      .select("started_at, ends_at")
      .eq("user_id", user.id)
      .gte("started_at", todayStartISO()),
    supabase
      .from("ai_settings")
      .select("max_break_minutes_per_day")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("profiles")
      .select("id, full_name, nickname"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nameById: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameById[p.id] = ((p as { nickname?: string | null; full_name: string }).nickname ?? p.full_name) as string;
  }

  const breaks = (activeData ?? []).map((b) => ({
    ...b,
    user_name: nameById[b.user_id] ?? "נציג",
  }));

  const myTodayMinutes = sumBreakMinutes(todayBreaks ?? []);
  const maxMinutesPerDay = settings?.max_break_minutes_per_day ?? 35;

  return NextResponse.json({
    breaks,
    myTodayMinutes,
    maxBreakMinutesPerDay: maxMinutesPerDay,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { durationMinutes?: number };
  const duration = Number(body.durationMinutes ?? 10);
  if (!duration || duration < 1 || duration > 120) {
    return NextResponse.json({ error: "durationMinutes must be 1-120" }, { status: 400 });
  }

  const [{ data: settings }, { data: todayBreaks }] = await Promise.all([
    supabase
      .from("ai_settings")
      .select("max_break_minutes_per_day")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("active_breaks")
      .select("started_at, ends_at")
      .eq("user_id", user.id)
      .gte("started_at", todayStartISO()),
  ]);

  const maxMinutes = settings?.max_break_minutes_per_day ?? 35;
  const usedMinutes = sumBreakMinutes(todayBreaks ?? []);
  const remaining = Math.max(0, maxMinutes - usedMinutes);

  if (usedMinutes >= maxMinutes) {
    return NextResponse.json(
      { error: "ניצלת את כל זמן ההפסקה שלך להיום", limitReached: true },
      { status: 400 }
    );
  }

  if (duration > remaining) {
    return NextResponse.json(
      { error: `נותרו לך רק ${remaining} דקות הפסקה להיום`, limitReached: false },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, nickname")
    .eq("id", user.id)
    .single();

  const now = new Date();
  const endsAt = new Date(now.getTime() + duration * 60 * 1000);

  const { error } = await supabase.from("active_breaks").insert({
    user_id: user.id,
    user_name: (profile as { nickname?: string | null; full_name?: string | null } | null)?.nickname ?? profile?.full_name ?? "נציג",
    started_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, endsAt: endsAt.toISOString() });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("active_breaks")
    .delete()
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
