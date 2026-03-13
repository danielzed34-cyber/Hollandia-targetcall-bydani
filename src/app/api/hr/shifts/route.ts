/**
 * /api/hr/shifts
 *
 * GET  – get shift constraints for the current user for a given week,
 *        plus the user's fixed shift hours and whether they have submitted
 *        Query: ?weekStart=YYYY-MM-DD
 * POST – upsert shift constraints for the week (window-enforced)
 *        Body: { weekStart: string; days: DayConstraint[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface DayConstraint {
  dayOfWeek: number;
  constraintType: "normal" | "day_off" | "short_shift";
  shiftStart?: string;
  shiftEnd?: string;
}

function getIsraelNow() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0");
  return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
}

function isWindowOpen(): boolean {
  const ilNow = getIsraelNow();
  const sunday = new Date(ilNow);
  sunday.setDate(ilNow.getDate() - ilNow.getDay());
  sunday.setHours(0, 0, 0, 0);
  const openAt = new Date(sunday);
  openAt.setDate(sunday.getDate() + 2);
  const closeAt = new Date(sunday);
  closeAt.setDate(sunday.getDate() + 4);
  closeAt.setHours(15, 0, 0, 0);
  return ilNow >= openAt && ilNow <= closeAt;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = request.nextUrl.searchParams.get("weekStart");
  if (!weekStart) return NextResponse.json({ error: "weekStart required" }, { status: 400 });

  const [{ data: constraintRows, error }, { data: profile }] = await Promise.all([
    supabase
      .from("shift_constraints")
      .select("day_of_week, constraint_type, shift_start, shift_end")
      .eq("user_id", user.id)
      .eq("week_start", weekStart),
    supabase
      .from("profiles")
      .select("shift_start_fixed, shift_end_fixed")
      .eq("id", user.id)
      .single(),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    constraints: constraintRows ?? [],
    fixedShift: {
      start: (profile as { shift_start_fixed?: string | null } | null)?.shift_start_fixed ?? null,
      end: (profile as { shift_end_fixed?: string | null } | null)?.shift_end_fixed ?? null,
    },
    hasSubmitted: (constraintRows ?? []).length > 0,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isWindowOpen()) {
    return NextResponse.json(
      { error: "חלון שליחת האילוצים סגור. ניתן לשלוח מיום שלישי עד יום חמישי ב-15:00." },
      { status: 403 }
    );
  }

  const body = await request.json() as { weekStart?: string; days?: DayConstraint[] };
  if (!body.weekStart || !Array.isArray(body.days)) {
    return NextResponse.json({ error: "weekStart and days required" }, { status: 400 });
  }

  await supabase
    .from("shift_constraints")
    .delete()
    .eq("user_id", user.id)
    .eq("week_start", body.weekStart);

  const rows = body.days.map((d) => ({
    user_id: user.id,
    week_start: body.weekStart!,
    day_of_week: d.dayOfWeek as 0 | 1 | 2 | 3 | 4,
    constraint_type: d.constraintType,
    shift_start: d.shiftStart ?? null,
    shift_end: d.shiftEnd ?? null,
  }));

  const { error } = await supabase.from("shift_constraints").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
