/**
 * GET  /api/admin/broadcasts  – today's broadcasts with target info
 * POST /api/admin/broadcasts  – create a broadcast for today
 *
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type BroadcastRow = Database["public"]["Tables"]["broadcasts"]["Row"];

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: broadcasts }, { data: profiles }] = await Promise.all([
    db
      .from("broadcasts")
      .select("*")
      .eq("broadcast_date", today)
      .order("created_at", { ascending: false }),
    db.from("profiles").select("id, full_name, nickname"),
  ]);

  const nameById: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameById[p.id] = (p.nickname ?? p.full_name) as string;
  }

  const enriched = ((broadcasts ?? []) as BroadcastRow[]).map((b) => ({
    ...b,
    target_user_name: b.target_user_id ? (nameById[b.target_user_id] ?? b.target_user_id) : null,
  }));

  return NextResponse.json({ broadcasts: enriched, profiles: profiles ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json() as {
    message?: string;
    target_all?: boolean;
    target_user_id?: string;
  };

  if (!body.message?.trim()) return NextResponse.json({ error: "הודעה חסרה" }, { status: 400 });
  if (!body.target_all && !body.target_user_id) {
    return NextResponse.json({ error: "יש לבחור מקבל" }, { status: 400 });
  }

  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await db
    .from("broadcasts")
    .insert({
      message: body.message.trim(),
      target_all: body.target_all ?? false,
      target_user_id: body.target_all ? null : (body.target_user_id ?? null),
      broadcast_date: today,
      created_by: admin.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ broadcast: data });
}
