/**
 * GET /api/goals
 * Returns the current user's active goal for today + team goal + their count.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  // Fetch personal goal + team goal + my count in parallel
  const [personalGoalRes, teamGoalRes, countRes] = await Promise.all([
    supabase
      .from("daily_goals")
      .select("target_count")
      .eq("date", today)
      .eq("goal_type", "individual")
      .eq("target_user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("daily_goals")
      .select("target_count")
      .eq("date", today)
      .eq("goal_type", "team")
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("daily_appointment_counts")
      .select("count")
      .eq("date", today)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    personalGoal: personalGoalRes.data?.target_count ?? null,
    teamGoal: teamGoalRes.data?.target_count ?? null,
    myCount: countRes.data?.count ?? 0,
  });
}
