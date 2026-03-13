/**
 * /api/feedback
 *
 * GET  – list feedback requests (admin: all; rep: own)
 * POST – rep creates a new feedback request
 *        body: { customerName, customerPhone, notes? }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

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

  const admin = createAdminClient();
  let query = admin
    .from("feedback_requests")
    .select("id, rep_id, rep_name, customer_name, customer_phone, struggle_point, status, transcript, report, action_improvements, action_preservation, acknowledged_at, created_at")
    .order("created_at", { ascending: false });

  if (profile?.role !== "Admin") {
    query = query.eq("rep_id", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, nickname")
    .eq("id", user.id)
    .single();

  const body = await request.json() as {
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  };

  if (!body.customerName?.trim() || !body.customerPhone?.trim()) {
    return NextResponse.json({ error: "customerName and customerPhone required" }, { status: 400 });
  }

  const repName = (profile as { full_name: string; nickname: string | null } | null)?.nickname
    ?? (profile as { full_name: string; nickname: string | null } | null)?.full_name
    ?? "נציג";

  const { data, error } = await supabase.from("feedback_requests").insert({
    rep_id: user.id,
    rep_name: repName,
    customer_name: body.customerName.trim(),
    customer_phone: body.customerPhone.trim(),
    struggle_point: body.notes?.trim() || "",
    status: "pending",
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
