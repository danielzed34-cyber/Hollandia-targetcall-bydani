/**
 * GET /api/analytics
 *
 * Admin-only. Returns aggregated stats from Supabase:
 * - appointmentsTotal, appointmentsThisWeek, appointmentsToday
 * - topReps (name + count, last 30 days)
 * - appointmentsByBranch (branch + count, all time)
 * - complaintsTotal, complaintsOpen
 * - clockEventsToday
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function startOf(unit: "day" | "week" | "month"): string {
  const d = new Date();
  if (unit === "day") {
    d.setHours(0, 0, 0, 0);
  } else if (unit === "week") {
    d.setDate(d.getDate() - d.getDay()); // Sunday
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

export async function GET() {
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

  const db = createAdminClient();

  // Parallel queries
  const [clockResult, profilesResult] = await Promise.all([
    db.from("clock_events")
      .select("user_id, event_type, timestamp")
      .eq("event_type", "clock_in")
      .gte("timestamp", startOf("day")),
    db.from("profiles").select("id, full_name, role"),
  ]);

  const clockEventsToday = clockResult.data?.length ?? 0;
  const totalUsers = profilesResult.data?.filter((p) => p.role === "Rep").length ?? 0;

  return NextResponse.json({
    clockEventsToday,
    totalUsers,
    // Placeholder appointment data (comes from Google Sheets, not Supabase)
    note: "Appointment stats come from Google Sheets. Clock/break data from Supabase.",
  });
}
