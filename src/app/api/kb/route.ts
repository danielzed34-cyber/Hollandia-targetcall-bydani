/**
 * /api/kb
 *
 * GET   – list/search articles (all authenticated users)
 *         ?q=search+term  for full-text search
 *         ?category=Cat   for category filter
 * POST  – create article (Admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "Admin";

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const category = request.nextUrl.searchParams.get("category") ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "";

  let query = supabase
    .from("kb_articles")
    .select("id, title, content, category, tags, status, image_url, ai_generated, created_at, updated_at")
    .order("updated_at", { ascending: false });

  // Reps only see approved articles; admins can filter by status
  if (!isAdmin) {
    query = query.eq("status", "approved");
  } else if (status) {
    query = query.eq("status", status as "draft" | "pending_approval" | "approved" | "rejected");
  }

  if (category) query = query.eq("category", category);
  if (q) {
    query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
  }

  const { data, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ articles: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json() as {
    title?: string; content?: string; category?: string; tags?: string[];
  };
  if (!body.title || !body.content || !body.category) {
    return NextResponse.json({ error: "title, content, category required" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db.from("kb_articles").insert({
    title: body.title,
    content: body.content,
    category: body.category,
    tags: body.tags ?? [],
    created_by: user.id,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
