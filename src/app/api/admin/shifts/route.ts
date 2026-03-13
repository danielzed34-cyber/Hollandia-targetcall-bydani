/**
 * /api/admin/shifts
 *
 * GET – admin view of all reps' shift constraints for a given week
 *       Query: ?weekStart=YYYY-MM-DD
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "Admin") return null;
  return user;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const weekStart = request.nextUrl.searchParams.get("weekStart");
  if (!weekStart) return NextResponse.json({ error: "weekStart required" }, { status: 400 });

  const db = createAdminClient();

  const [profilesResult, constraintsResult] = await Promise.all([
    db.from("profiles").select("id, full_name, nickname, shift_start_fixed, shift_end_fixed").eq("role", "Rep").order("full_name"),
    db.from("shift_constraints").select("user_id, day_of_week, constraint_type, shift_start, shift_end").eq("week_start", weekStart),
  ]);

  if (profilesResult.error) {
    console.error("[admin/shifts] profiles error:", profilesResult.error);
    return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });
  }
  if (constraintsResult.error) {
    console.error("[admin/shifts] constraints error:", constraintsResult.error);
    return NextResponse.json({ error: constraintsResult.error.message }, { status: 500 });
  }

  const profiles = profilesResult.data;
  const constraints = constraintsResult.data;

  const reps = (profiles ?? []).map((p: { id: string; full_name: string; nickname: string | null; shift_start_fixed: string | null; shift_end_fixed: string | null }) => ({
    id: p.id,
    name: p.nickname ?? p.full_name,
    fixedStart: p.shift_start_fixed,
    fixedEnd: p.shift_end_fixed,
    days: Array.from({ length: 5 }, (_, i) => {
      const c = (constraints ?? []).find((x: { user_id: string; day_of_week: number }) => x.user_id === p.id && x.day_of_week === i);
      if (!c) return { type: "normal", start: p.shift_start_fixed, end: p.shift_end_fixed };
      // For normal days stored in DB, fall back to fixed hours for display
      return {
        type: c.constraint_type,
        start: c.shift_start ?? (c.constraint_type === "normal" ? p.shift_start_fixed : null),
        end: c.shift_end ?? (c.constraint_type === "normal" ? p.shift_end_fixed : null),
      };
    }),
    hasSubmitted: (constraints ?? []).some((x: { user_id: string }) => x.user_id === p.id),
  }));

  return NextResponse.json({ reps, weekStart });
}
