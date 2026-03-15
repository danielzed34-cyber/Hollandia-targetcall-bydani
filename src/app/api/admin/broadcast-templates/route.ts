/**
 * GET  /api/admin/broadcast-templates  — list all templates
 * POST /api/admin/broadcast-templates  — create template
 * DELETE /api/admin/broadcast-templates?id=xxx — delete template
 */
import { NextRequest, NextResponse } from "next/server";
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
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("broadcast_templates")
    .select("id, title, message, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { title, message } = await req.json() as { title?: string; message?: string };
  if (!title?.trim() || !message?.trim())
    return NextResponse.json({ error: "כותרת והודעה הם שדות חובה" }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db.from("broadcast_templates").insert({
    title: title.trim(),
    message: message.trim(),
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "חסר id" }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db.from("broadcast_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
