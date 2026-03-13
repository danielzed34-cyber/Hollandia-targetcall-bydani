/**
 * POST /api/feedback/[id]/acknowledge
 *
 * Rep-only. Rep has read the feedback report and submits their action plan.
 * Body: { actionImprovements: string, actionPreservation: string }
 * On success: status → "acknowledged", action plan is saved.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body = await request.json() as {
    actionImprovements?: string;
    actionPreservation?: string;
  };

  if (!body.actionImprovements?.trim() || !body.actionPreservation?.trim()) {
    return NextResponse.json({ error: "יש למלא את שתי השדות — שיפור ושימור" }, { status: 400 });
  }

  // Verify this request belongs to the rep
  const { data: existing } = await supabase
    .from("feedback_requests")
    .select("rep_id, status")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (existing.rep_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.status !== "done") {
    return NextResponse.json({ error: "ניתן לאשר רק בקשות שהושלמו" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("feedback_requests")
    .update({
      status: "acknowledged",
      action_improvements: body.actionImprovements.trim(),
      action_preservation: body.actionPreservation.trim(),
      acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
