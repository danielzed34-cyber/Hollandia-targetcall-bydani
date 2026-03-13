/**
 * POST /api/whatsapp/send
 *
 * Any authenticated user (rep or admin) can send a WhatsApp message
 * through the local microservice.
 * Body: { to: string, message: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { to?: string; message?: string };
  if (!body.to || !body.message) {
    return NextResponse.json({ error: "to and message required" }, { status: 400 });
  }

  const serviceUrl = process.env.WHATSAPP_SERVICE_URL ?? "http://localhost:3001";
  const secret = process.env.WHATSAPP_SERVICE_SECRET ?? "";

  try {
    const res = await fetch(`${serviceUrl}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ to: body.to, message: body.message }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "WhatsApp service unreachable" }, { status: 503 });
  }
}
