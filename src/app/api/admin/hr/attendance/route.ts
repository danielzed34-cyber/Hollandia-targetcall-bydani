/**
 * GET /api/admin/hr/attendance
 *
 * Admin-only. Returns attendance summary for all users for a given ISO week.
 * Query: ?weekStart=YYYY-MM-DD  (defaults to current week's Sunday)
 *
 * Returns:
 * {
 *   weekStart: string,
 *   records: {
 *     userId: string,
 *     displayName: string,
 *     role: "Admin" | "Rep",
 *     currentStatus: "clocked_in" | "clocked_out",
 *     todayMinutes: number,
 *     weekMinutes: number,
 *   }[]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function minutesBetween(a: string, b: string): number {
  return Math.max(0, Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

function currentWeekSunday(): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "Admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const param = request.nextUrl.searchParams.get("weekStart");
  const weekStart = param ? new Date(param + "T00:00:00.000Z") : currentWeekSunday();
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  const todayISO = new Date().toISOString().split("T")[0];
  const admin = createAdminClient();

  // All profiles
  const { data: allProfiles } = await admin
    .from("profiles")
    .select("id, full_name, nickname, role")
    .order("full_name");

  // Clock events this week
  const { data: weekEvents } = await admin
    .from("clock_events")
    .select("user_id, event_type, timestamp")
    .gte("timestamp", weekStart.toISOString())
    .lt("timestamp", weekEnd.toISOString())
    .order("timestamp", { ascending: true });

  // Last event per user (for current status) — fetch recent 1000 rows
  const { data: recentEvents } = await admin
    .from("clock_events")
    .select("user_id, event_type")
    .order("timestamp", { ascending: false })
    .limit(1000);

  const lastEventByUser: Record<string, string> = {};
  for (const ev of recentEvents ?? []) {
    if (!lastEventByUser[ev.user_id]) {
      lastEventByUser[ev.user_id] = ev.event_type;
    }
  }

  const records = (allProfiles ?? []).map((p) => {
    const userWeekEvents = (weekEvents ?? []).filter((e) => e.user_id === p.id);
    let weekMinutes = 0;
    let todayMinutes = 0;
    let pendingIn: string | null = null;

    for (const ev of userWeekEvents) {
      if (ev.event_type === "clock_in") {
        pendingIn = ev.timestamp;
      } else if (ev.event_type === "clock_out" && pendingIn) {
        const mins = minutesBetween(pendingIn, ev.timestamp);
        weekMinutes += mins;
        const evDate = ev.timestamp.split("T")[0];
        if (evDate === todayISO) todayMinutes += mins;
        pendingIn = null;
      }
    }

    return {
      userId: p.id,
      displayName: (p.nickname ?? p.full_name) as string,
      role: p.role as "Admin" | "Rep",
      currentStatus: (lastEventByUser[p.id] === "clock_in" ? "clocked_in" : "clocked_out") as "clocked_in" | "clocked_out",
      todayMinutes,
      weekMinutes,
    };
  });

  return NextResponse.json({
    weekStart: weekStart.toISOString().split("T")[0],
    records,
  });
}
