/**
 * POST /api/hr/clock
 *
 * Body: { action: "clock_in" | "clock_out" }
 *
 * Records a clock event for the authenticated user.
 * Returns { success, status: "clocked_in" | "clocked_out", timestamp }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get last clock event for this user
  const { data } = await supabase
    .from("clock_events")
    .select("event_type, timestamp")
    .eq("user_id", user.id)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  const status = data?.event_type === "clock_in" ? "clocked_in" : "clocked_out";
  return NextResponse.json({ status, lastEvent: data?.timestamp ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { action?: string };
  const action = body.action;
  if (action !== "clock_in" && action !== "clock_out") {
    return NextResponse.json({ error: "action must be clock_in or clock_out" }, { status: 400 });
  }

  const { error } = await supabase.from("clock_events").insert({
    user_id: user.id,
    event_type: action,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    status: action === "clock_in" ? "clocked_in" : "clocked_out",
    timestamp: new Date().toISOString(),
  });
}
