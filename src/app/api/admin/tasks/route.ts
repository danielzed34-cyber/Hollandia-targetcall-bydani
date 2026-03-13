/**
 * GET  /api/admin/tasks  – list all tasks with completion stats
 * POST /api/admin/tasks  – create a new task
 *
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const db = createAdminClient();

  const [
    { data: tasks },
    { data: targets },
    { data: completions },
    { data: profiles },
  ] = await Promise.all([
    db.from("tasks").select("*").order("due_date", { ascending: true }),
    db.from("task_targets").select("task_id, user_id"),
    db.from("task_completions").select("task_id, user_id"),
    db.from("profiles").select("id, full_name, nickname").order("full_name"),
  ]);

  const nameById: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameById[p.id] = (p.nickname ?? p.full_name) as string;
  }

  const enriched = (tasks ?? []).map((t) => {
    const taskTargets = (targets ?? []).filter((tt) => tt.task_id === t.id);
    const taskCompletions = (completions ?? []).filter((tc) => tc.task_id === t.id);
    return {
      ...t,
      targetUserIds: taskTargets.map((tt) => tt.user_id),
      targetUserNames: taskTargets.map((tt) => nameById[tt.user_id] ?? tt.user_id),
      completionCount: taskCompletions.length,
      completedByUserIds: taskCompletions.map((tc) => tc.user_id),
    };
  });

  return NextResponse.json({ tasks: enriched, profiles: profiles ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json() as {
    title?: string;
    description?: string;
    due_date?: string;
    priority?: "low" | "normal" | "high";
    target_all?: boolean;
    target_user_ids?: string[];
  };

  if (!body.title?.trim()) return NextResponse.json({ error: "כותרת חסרה" }, { status: 400 });
  if (!body.due_date) return NextResponse.json({ error: "תאריך יעד חסר" }, { status: 400 });

  const db = createAdminClient();

  const { data: task, error } = await db
    .from("tasks")
    .insert({
      title: body.title.trim(),
      description: body.description?.trim() || null,
      due_date: body.due_date,
      priority: body.priority ?? "normal",
      target_all: body.target_all ?? true,
      created_by: admin.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert specific targets if needed
  if (!body.target_all && body.target_user_ids?.length) {
    await db.from("task_targets").insert(
      body.target_user_ids.map((uid) => ({ task_id: task.id, user_id: uid }))
    );
  }

  return NextResponse.json({ task });
}
