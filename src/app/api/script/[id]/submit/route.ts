/**
 * /api/script/[id]/submit
 *
 * POST – submit a draft script for admin approval
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("call_scripts")
    .select("id, rep_id, status")
    .eq("id", id)
    .eq("rep_id", user.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["draft", "rejected"].includes(existing.status)) {
    return NextResponse.json({ error: "Only draft or rejected scripts can be submitted" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("call_scripts")
    .update({ status: "pending", admin_note: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ script: data });
}
