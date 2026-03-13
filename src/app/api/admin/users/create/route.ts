/**
 * POST /api/admin/users/create
 *
 * Admin-only. Creates a new Supabase Auth user.
 * Body: { username, fullName, role: "Admin"|"Rep", password }
 *
 * The username is converted to an email in the form:
 *   username@hollandia.internal
 * The on_auth_user_created trigger will auto-create their profile row.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { INTERNAL_EMAIL_DOMAIN } from "@/config/external-links";

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

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json() as {
    username?: string;
    fullName?: string;
    role?: string;
    password?: string;
  };

  const { username, fullName, role, password } = body;

  if (!username?.trim()) return NextResponse.json({ error: "שם משתמש הוא שדה חובה" }, { status: 400 });
  if (!fullName?.trim()) return NextResponse.json({ error: "שם מלא הוא שדה חובה" }, { status: 400 });
  if (!password || password.length < 4) return NextResponse.json({ error: "סיסמה חייבת להכיל לפחות 4 תווים" }, { status: 400 });
  if (!["Admin", "Rep"].includes(role ?? "")) return NextResponse.json({ error: "תפקיד לא תקין" }, { status: 400 });

  const email = `${username.trim().toLowerCase()}@${INTERNAL_EMAIL_DOMAIN}`;

  const db = createAdminClient();
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip confirmation email for internal users
    user_metadata: {
      full_name: fullName.trim(),
      role: role as "Admin" | "Rep",
    },
  });

  if (error) {
    const msg = error.message.includes("already been registered")
      ? "שם המשתמש כבר קיים במערכת"
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId: data.user.id });
}
