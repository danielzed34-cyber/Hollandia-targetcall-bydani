/**
 * /api/script
 *
 * GET  – current user's call script (one per rep, latest)
 * POST – create a new draft script
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, nickname")
    .eq("id", user.id)
    .single();
  return { user, profile };
}

export async function GET() {
  const auth = await getUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("call_scripts")
    .select("*")
    .eq("rep_id", auth.user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ script: data ?? null });
}

export async function POST(request: NextRequest) {
  const auth = await getUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    section_1?: string; section_2?: string; section_3?: string;
    section_4?: string; section_5?: string; section_6?: string;
  };

  const repName = auth.profile?.nickname ?? auth.profile?.full_name ?? "נציג";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("call_scripts")
    .insert({
      rep_id: auth.user.id,
      rep_name: repName,
      section_1: body.section_1 ?? "",
      section_2: body.section_2 ?? "",
      section_3: body.section_3 ?? "",
      section_4: body.section_4 ?? "",
      section_5: body.section_5 ?? "",
      section_6: body.section_6 ?? "",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ script: data }, { status: 201 });
}
