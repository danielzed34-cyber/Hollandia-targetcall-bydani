/**
 * GET /api/whatsapp/status
 *
 * Admin-only proxy to the WhatsApp microservice.
 * Returns { connected: bool, qr: string|null }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "Admin") return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const serviceUrl = process.env.WHATSAPP_SERVICE_URL ?? "http://localhost:3001";

  try {
    const res = await fetch(`${serviceUrl}/status`, { next: { revalidate: 0 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ connected: false, qr: null, offline: true });
  }
}
