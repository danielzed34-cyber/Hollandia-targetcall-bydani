"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckSquare, AlertTriangle, Clock, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: "low" | "normal" | "high";
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "נמוכה",
  normal: "רגילה",
  high: "גבוהה",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export function TaskWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/tasks");
    if (res.ok) {
      const data = await res.json() as { tasks: Task[] };
      setTasks(data.tasks);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function complete(id: string) {
    setCompleting(id);
    try {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("שגיאה");
      toast.success("המשימה סומנה כבוצעה!");
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("שגיאה בעדכון המשימה");
    } finally {
      setCompleting(null);
    }
  }

  if (tasks.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  const overdueCount = tasks.filter((t) => t.due_date < today).length;

  return (
    <Card className={cn(
      "border",
      overdueCount > 0
        ? "border-red-500/30 bg-red-500/[0.03]"
        : "border-amber-500/20 bg-amber-500/[0.03]"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className={cn(
          "flex items-center gap-2 text-base",
          overdueCount > 0
            ? "text-red-600 dark:text-red-400"
            : "text-amber-700 dark:text-amber-400"
        )}>
          <CheckSquare className="h-4 w-4" />
          משימות פתוחות ({tasks.length})
          {overdueCount > 0 && (
            <span className="text-xs font-normal text-red-500">
              — {overdueCount} באיחור!
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => {
          const isOverdue = task.due_date < today;
          const isCompleting = completing === task.id;

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                isOverdue
                  ? "border-red-500/40 bg-red-500/[0.06]"
                  : "border-border/60 bg-background"
              )}
            >
              {isOverdue
                ? <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                : <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              }

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-semibold leading-tight",
                  isOverdue && "text-red-600 dark:text-red-400"
                )}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-[11px]",
                    isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                  )}>
                    {isOverdue ? `באיחור — ${task.due_date}` : `עד: ${task.due_date}`}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0 h-4 border-0", PRIORITY_COLORS[task.priority])}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </Badge>
                </div>
              </div>

              <Button
                size="sm"
                variant={isOverdue ? "destructive" : "outline"}
                className="shrink-0 gap-1 h-7 text-xs px-2.5"
                disabled={isCompleting}
                onClick={() => complete(task.id)}
              >
                {isCompleting
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Check className="h-3 w-3" />
                }
                בוצע
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
