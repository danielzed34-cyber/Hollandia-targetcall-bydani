/**
 * GET /api/admin/whatsapp-approvals
 *
 * Admin-only. Returns all pending WhatsApp approval requests.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("whatsapp_approvals")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  // If the table doesn't exist yet (migration pending), return empty list gracefully
  if (error) {
    if (error.code === "42P01") return NextResponse.json({ approvals: [] }); // relation does not exist
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ approvals: data ?? [] });
}
