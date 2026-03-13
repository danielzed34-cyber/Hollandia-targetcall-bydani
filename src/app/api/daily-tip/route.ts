/**
 * GET /api/daily-tip
 *
 * Returns the daily tip from ai_settings for any authenticated user.
 * Returns: { tip: string | null }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ tip: null });

  const { data } = await supabase
    .from("ai_settings")
    .select("daily_tip")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  const tip = data?.daily_tip?.trim() || null;
  return NextResponse.json({ tip });
}
