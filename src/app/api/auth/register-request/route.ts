/**
 * POST /api/auth/register-request
 * Public endpoint — submits a registration request for admin approval.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { encryptPassword } from "@/lib/crypto";
import { INTERNAL_EMAIL_DOMAIN } from "@/config/external-links";

export const runtime = "nodejs";

const EN_REGEX = /^[a-zA-Z0-9._-]+$/;
const HE_REGEX = /^[\u0590-\u05FF\s'"״׳-]+$/;

export async function POST(req: Request) {
  const body = await req.json() as {
    username?: string;
    fullName?: string;
    password?: string;
  };

  const username = body.username?.trim().toLowerCase() ?? "";
  const fullName = body.fullName?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !fullName || !password)
    return NextResponse.json({ error: "כל השדות חובה" }, { status: 400 });

  if (!EN_REGEX.test(username))
    return NextResponse.json({ error: "שם משתמש חייב להכיל אותיות אנגלית בלבד" }, { status: 400 });

  if (!HE_REGEX.test(fullName))
    return NextResponse.json({ error: "שם מלא חייב להיות בעברית" }, { status: 400 });

  if (password.length < 6)
    return NextResponse.json({ error: "סיסמה חייבת להכיל לפחות 6 תווים" }, { status: 400 });

  const db = createAdminClient();

  // Check if a pending request for this username already exists
  const { data: existing } = await db
    .from("registration_requests")
    .select("id")
    .eq("username", username)
    .eq("status", "pending")
    .maybeSingle();

  if (existing)
    return NextResponse.json({ error: "קיימת כבר בקשת הרשמה עבור שם משתמש זה" }, { status: 409 });

  // Check if auth user with this email already exists
  const email = `${username}@${INTERNAL_EMAIL_DOMAIN}`;
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (users?.users?.some((u) => u.email === email))
    return NextResponse.json({ error: "שם משתמש זה כבר רשום במערכת" }, { status: 409 });

  const { error } = await db.from("registration_requests").insert({
    username,
    full_name: fullName,
    enc_password: encryptPassword(password),
    status: "pending",
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
