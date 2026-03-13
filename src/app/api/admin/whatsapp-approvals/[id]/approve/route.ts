/**
 * POST /api/admin/whatsapp-approvals/[id]/approve
 *
 * Admin-only. Approves a pending WhatsApp approval request:
 * 1. Fetches the request
 * 2. Sends the WhatsApp message
 * 3. Updates status to 'sent'
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import type { Database } from "@/types/supabase";

type WaApprovalRow = Database["public"]["Tables"]["whatsapp_approvals"]["Row"];

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // Fetch the approval request
  const { data: approvalRaw, error: fetchError } = await supabase
    .from("whatsapp_approvals")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .single();
  const approval = approvalRaw as WaApprovalRow | null;

  if (fetchError ?? !approval) {
    return NextResponse.json({ error: "Request not found or already processed" }, { status: 404 });
  }

  // Send the WhatsApp message
  await sendWhatsAppMessage(approval.customer_phone, approval.message);

  // Update status to sent
  const { error: updateError } = await supabase
    .from("whatsapp_approvals")
    .update({ status: "sent" })
    .eq("id", id);

  if (updateError) {
    console.error("[approve]", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
