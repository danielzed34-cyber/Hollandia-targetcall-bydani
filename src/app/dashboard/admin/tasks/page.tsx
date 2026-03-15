"use client";

import { useState } from "react";
import { TasksManager } from "@/components/admin/tasks-manager";
import { BroadcastSender } from "@/components/admin/broadcast-sender";
import { GoalsManager } from "@/components/admin/goals-manager";
import { CheckSquare, Megaphone, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "tasks",      label: "משימות",  icon: CheckSquare },
  { id: "broadcasts", label: "הודעות",  icon: Megaphone   },
  { id: "goals",      label: "יעדים",   icon: Target      },
] as const;

type TabId = typeof TABS[number]["id"];

export default function AdminTasksPage() {
  const [active, setActive] = useState<TabId>("tasks");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">משימות והודעות</h1>
        <p className="text-sm text-muted-foreground mt-1">
          הגדר משימות לנציגים ושלח הודעות לצוות
        </p>
      </div>

      {/* ── Nav list ──────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              active === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      {active === "tasks"      && <TasksManager />}
      {active === "broadcasts" && <BroadcastSender />}
      {active === "goals"      && <GoalsManager />}
    </div>
  );
}
