/**
 * GET /api/tasks
 *
 * Returns pending (non-completed) tasks assigned to the current rep.
 * "Assigned" means: target_all = true OR this user is in task_targets.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    { data: allTasks },
    { data: myTargets },
    { data: myCompletions },
  ] = await Promise.all([
    supabase.from("tasks").select("*").order("due_date", { ascending: true }),
    supabase.from("task_targets").select("task_id").eq("user_id", user.id),
    supabase.from("task_completions").select("task_id").eq("user_id", user.id),
  ]);

  const myTargetTaskIds = new Set((myTargets ?? []).map((t) => t.task_id));
  const completedTaskIds = new Set((myCompletions ?? []).map((c) => c.task_id));

  const pending = (allTasks ?? []).filter((t) => {
    const isAssigned = t.target_all || myTargetTaskIds.has(t.id);
    return isAssigned && !completedTaskIds.has(t.id);
  });

  return NextResponse.json({ tasks: pending });
}
