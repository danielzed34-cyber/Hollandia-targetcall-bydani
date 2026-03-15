/**
 * GET /api/admin/registration-requests
 * Returns all registration requests (admin only).
 */
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "Admin" ? user : null;
}

export async function GET() {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("registration_requests")
    .select("id, username, full_name, status, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}
