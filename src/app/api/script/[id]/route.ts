/**
 * /api/script/[id]
 *
 * PUT – update sections of a draft/rejected script (rep only, own script)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    section_1?: string; section_2?: string; section_3?: string;
    section_4?: string; section_5?: string; section_6?: string;
  };

  // Ensure it belongs to user and is editable
  const { data: existing } = await supabase
    .from("call_scripts")
    .select("id, rep_id, status")
    .eq("id", id)
    .eq("rep_id", user.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["draft", "rejected"].includes(existing.status)) {
    return NextResponse.json({ error: "Script is not editable in current status" }, { status: 400 });
  }

  const update: Record<string, string> = { updated_at: new Date().toISOString() };
  for (const key of ["section_1","section_2","section_3","section_4","section_5","section_6"] as const) {
    if (body[key] !== undefined) update[key] = body[key]!;
  }

  const { data, error } = await supabase
    .from("call_scripts")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ script: data });
}
