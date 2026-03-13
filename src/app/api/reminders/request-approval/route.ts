/**
 * POST /api/reminders/request-approval
 *
 * Rep submits a request for admin to approve sending a WhatsApp reminder
 * to an unverified customer. Admin is then notified via the reminders panel.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get rep's profile for rep_name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, nickname, role")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (profile.role === "Admin") {
    return NextResponse.json({ error: "Admins can send directly" }, { status: 400 });
  }

  const body = await request.json() as {
    customerName?: string;
    customerPhone?: string;
    branch?: string;
    meetingDate?: string;
    meetingTime?: string;
    message?: string;
  };

  if (!body.customerName || !body.customerPhone || !body.branch || !body.meetingDate || !body.message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const repName = profile.nickname ?? profile.full_name;

  // Check for existing pending request for same customer + date (avoid duplicates)
  const { data: existing } = await supabase
    .from("whatsapp_approvals")
    .select("id")
    .eq("rep_id", user.id)
    .eq("customer_name", body.customerName.trim())
    .eq("meeting_date", body.meetingDate.trim())
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "בקשה כבר קיימת עבור לקוח זה" }, { status: 409 });
  }

  const { error } = await supabase.from("whatsapp_approvals").insert({
    rep_id: user.id,
    rep_name: repName,
    customer_name: body.customerName.trim(),
    customer_phone: body.customerPhone.trim(),
    branch: body.branch.trim(),
    meeting_date: body.meetingDate.trim(),
    meeting_time: body.meetingTime?.trim() ?? "",
    message: body.message.trim(),
  });

  if (error) {
    console.error("[request-approval]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
