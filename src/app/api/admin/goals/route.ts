/**
 * GET  /api/admin/goals  — list all reps + today's goals + actual counts
 * POST /api/admin/goals  — upsert draft goals (team + per-rep)
 * PATCH /api/admin/goals?action=activate — activate all drafts + broadcast
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

type GoalRow = Database["public"]["Tables"]["daily_goals"]["Row"];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "Admin" ? user : null;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const [profilesRes, goalsRes, countsRes] = await Promise.all([
    db.from("profiles").select("id, full_name, nickname").eq("role", "Rep").order("full_name"),
    db.from("daily_goals").select("*").eq("date", today),
    db.from("daily_appointment_counts").select("user_id, count").eq("date", today),
  ]);

  return NextResponse.json({
    profiles: profilesRes.data ?? [],
    goals: goalsRes.data ?? [],
    counts: countsRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json() as {
    teamGoal?: number | null;
    individualGoals?: { userId: string; count: number }[];
  };

  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const upserts: Database["public"]["Tables"]["daily_goals"]["Insert"][] = [];

  if (body.teamGoal && body.teamGoal > 0) {
    upserts.push({
      date: today,
      goal_type: "team",
      target_user_id: null,
      target_count: body.teamGoal,
      status: "draft",
      created_by: user.id,
    });
  }

  for (const ig of body.individualGoals ?? []) {
    if (ig.count > 0) {
      upserts.push({
        date: today,
        goal_type: "individual",
        target_user_id: ig.userId,
        target_count: ig.count,
        status: "draft",
        created_by: user.id,
      });
    }
  }

  if (upserts.length === 0) return NextResponse.json({ success: true });

  const { error } = await db
    .from("daily_goals")
    .upsert(upserts, { onConflict: "date,goal_type,target_user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  if (searchParams.get("action") !== "activate")
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Activate all drafts for today
  const activateRes = await db
    .from("daily_goals")
    .update({ status: "active", activated_at: new Date().toISOString() })
    .eq("date", today)
    .eq("status", "draft")
    .select();

  if (activateRes.error) return NextResponse.json({ error: activateRes.error.message }, { status: 500 });
  const activated = activateRes.data as GoalRow[];

  if (!activated || activated.length === 0)
    return NextResponse.json({ success: true, sent: 0 });

  // Build broadcasts for each goal
  const broadcasts: { message: string; target_all: boolean; target_user_id: string | null }[] = [];

  const teamGoal = activated.find((g) => g.goal_type === "team");
  if (teamGoal) {
    broadcasts.push({
      message: `🎯 יעד הצוות להיום: ${teamGoal.target_count} פגישות — בהצלחה לכולם!`,
      target_all: true,
      target_user_id: null,
    });
  }

  for (const g of activated.filter((g) => g.goal_type === "individual")) {
    broadcasts.push({
      message: `🎯 היעד שלך להיום: ${g.target_count} פגישות — אתה יכול!`,
      target_all: false,
      target_user_id: g.target_user_id,
    });
  }

  // Send broadcasts
  const broadcastInserts = broadcasts.map((b) => ({
    ...b,
    broadcast_date: today,
    created_by: user.id,
  }));

  await db.from("broadcasts").insert(broadcastInserts);

  return NextResponse.json({ success: true, sent: broadcasts.length });
}
