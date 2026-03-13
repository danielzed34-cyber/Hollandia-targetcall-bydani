/**
 * /api/admin/settings
 *
 * GET  – fetch current AI mentor settings (Admin only)
 * PUT  – upsert AI mentor settings { systemPrompt, dailyTip } (Admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const db = createAdminClient();
  const { data } = await db
    .from("ai_settings")
    .select("id, system_prompt, daily_tip, max_breaks_per_day, max_break_minutes_per_day, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ settings: data ?? null });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json() as { systemPrompt?: string; dailyTip?: string; maxBreaksPerDay?: number; maxBreakMinutesPerDay?: number };

  const db = createAdminClient();

  // Check if a row already exists
  const { data: existing } = await db
    .from("ai_settings")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  const now = new Date().toISOString();
  const payload = {
    system_prompt: body.systemPrompt ?? "",
    max_breaks_per_day: body.maxBreaksPerDay ?? 1,
    max_break_minutes_per_day: body.maxBreakMinutesPerDay ?? 35,
    daily_tip: body.dailyTip ?? "",
    updated_by: admin.id,
    updated_at: now,
  };

  let error;
  if (existing?.id) {
    ({ error } = await db.from("ai_settings").update(payload).eq("id", existing.id));
  } else {
    ({ error } = await db.from("ai_settings").insert(payload));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
