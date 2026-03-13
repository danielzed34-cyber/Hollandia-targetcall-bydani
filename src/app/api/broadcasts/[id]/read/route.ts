/**
 * POST /api/broadcasts/[id]/read
 *
 * Rep marks a broadcast as read. Idempotent (upsert).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await supabase.from("broadcast_reads").upsert({
    broadcast_id: id,
    user_id: user.id,
  });
  return NextResponse.json({ success: true });
}
