/**
 * /api/admin/scripts
 *
 * GET – list all call scripts (Admin only), optionally filter by status
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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const db = createAdminClient();
  let query = db.from("call_scripts").select("*").order("updated_at", { ascending: false });
  if (status) query = query.eq("status", status as "draft" | "pending" | "approved" | "rejected");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scripts: data ?? [] });
}
