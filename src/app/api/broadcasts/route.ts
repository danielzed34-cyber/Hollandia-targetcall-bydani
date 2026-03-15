/**
 * GET /api/broadcasts
 *
 * Returns today's unread broadcasts for the current user.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const [{ data: broadcasts }, { data: reads }] = await Promise.all([
    supabase
      .from("broadcasts")
      .select("id, message, created_at")
      .eq("broadcast_date", today)
      .or(`target_all.eq.true,target_user_id.eq.${user.id}`)
      .order("created_at", { ascending: true }),
    supabase
      .from("broadcast_reads")
      .select("broadcast_id")
      .eq("user_id", user.id),
  ]);

  const readIds = new Set((reads ?? []).map((r) => r.broadcast_id));
  const unread = (broadcasts ?? []).filter((b) => !readIds.has(b.id));

  return NextResponse.json({ broadcasts: unread });
}
