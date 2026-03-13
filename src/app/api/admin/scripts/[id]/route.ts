/**
 * /api/admin/scripts/[id]
 *
 * PATCH – approve or reject a call script
 *         body: { action: "approve" | "reject", admin_note?: string }
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json() as { action: string; admin_note?: string };
  if (!["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("call_scripts")
    .update({
      status: body.action === "approve" ? "approved" : "rejected",
      admin_note: body.admin_note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ script: data });
}
