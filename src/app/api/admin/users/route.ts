/**
 * /api/admin/users
 *
 * GET   – list all profiles (Admin only)
 * PATCH – update a user's role and/or nickname  (Admin only)
 *         body: { userId, role?: "Admin" | "Rep", nickname?: string }
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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json() as {
    userId?: string;
    role?: string;
    nickname?: string;
    shift_start_fixed?: string | null;
    shift_end_fixed?: string | null;
  };
  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.role !== undefined) {
    if (!["Admin", "Rep"].includes(body.role)) {
      return NextResponse.json({ error: "role must be Admin or Rep" }, { status: 400 });
    }
    update.role = body.role;
  }

  if (body.nickname !== undefined) {
    update.nickname = body.nickname.trim() || null;
  }

  if (body.shift_start_fixed !== undefined) {
    update.shift_start_fixed = body.shift_start_fixed?.trim() || null;
  }
  if (body.shift_end_fixed !== undefined) {
    update.shift_end_fixed = body.shift_end_fixed?.trim() || null;
  }

  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update(update)
    .eq("id", body.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
