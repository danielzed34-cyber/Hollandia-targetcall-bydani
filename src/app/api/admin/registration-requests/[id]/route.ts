/**
 * PATCH /api/admin/registration-requests/[id]
 * Body: { action: "approve" | "reject" }
 * Approve → creates Supabase auth user then marks approved.
 * Reject  → marks rejected.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { decryptPassword } from "@/lib/crypto";
import { INTERNAL_EMAIL_DOMAIN } from "@/config/external-links";
import type { Database } from "@/types/supabase";

type RegRequestRow = Database["public"]["Tables"]["registration_requests"]["Row"];

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "Admin" ? user : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { action } = await req.json() as { action: "approve" | "reject" };

  if (!["approve", "reject"].includes(action))
    return NextResponse.json({ error: "פעולה לא תקינה" }, { status: 400 });

  const db = createAdminClient();

  // Fetch the request
  const { data: regReqRaw, error: fetchErr } = await db
    .from("registration_requests")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .single();

  const regReq = regReqRaw as RegRequestRow | null;

  if (fetchErr || !regReq)
    return NextResponse.json({ error: "בקשה לא נמצאה" }, { status: 404 });

  if (action === "reject") {
    await db.from("registration_requests").update({ status: "rejected" }).eq("id", id);
    return NextResponse.json({ success: true });
  }

  // Approve — create the auth user
  const email = `${regReq.username}@${INTERNAL_EMAIL_DOMAIN}`;
  let plainPassword: string;
  try {
    plainPassword = decryptPassword(regReq.enc_password);
  } catch {
    return NextResponse.json({ error: "שגיאה בפענוח הסיסמה" }, { status: 500 });
  }

  const { error: createErr } = await db.auth.admin.createUser({
    email,
    password: plainPassword,
    email_confirm: true,
    user_metadata: {
      full_name: regReq.full_name,
      role: "Rep",
    },
  });

  if (createErr) {
    const msg = createErr.message.includes("already been registered")
      ? "שם המשתמש כבר קיים במערכת"
      : createErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Mark approved
  await db.from("registration_requests").update({ status: "approved" }).eq("id", id);

  // Also set nickname on the newly created profile
  const { data: newProfile } = await db
    .from("profiles")
    .select("id")
    .eq("full_name", regReq.full_name)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (newProfile) {
    await db.from("profiles").update({ nickname: regReq.full_name }).eq("id", newProfile.id);
  }

  return NextResponse.json({ success: true });
}
