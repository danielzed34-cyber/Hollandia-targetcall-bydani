"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Trash2, CheckSquare, AlertTriangle, Users, User,
  Check, X, Send, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  nickname: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: "low" | "normal" | "high";
  target_all: boolean;
  targetUserIds: string[];
  targetUserNames: string[];
  completionCount: number;
  completedByUserIds: string[];
}

const PRIORITY_LABELS: Record<string, string> = { low: "נמוכה", normal: "רגילה", high: "גבוהה" };
const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

// ── Completion detail dialog ──────────────────────────────────────────────────

function CompletionDialog({
  task,
  profiles,
  onClose,
}: {
  task: Task | null;
  profiles: Profile[];
  onClose: () => void;
}) {
  const [sending, setSending] = useState<string | null>(null);

  if (!task) return null;

  const nameById: Record<string, string> = {};
  for (const p of profiles) {
    nameById[p.id] = (p.nickname ?? p.full_name) as string;
  }

  const targetIds = task.target_all ? profiles.map((p) => p.id) : task.targetUserIds;
  const completedSet = new Set(task.completedByUserIds);
  const done = targetIds.filter((id) => completedSet.has(id));
  const pending = targetIds.filter((id) => !completedSet.has(id));

  async function sendReminder(userId: string) {
    setSending(userId);
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `🔔 תזכורת דחופה: יש לבצע את המשימה "${task!.title}"`,
          target_all: false,
          target_user_id: userId,
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      toast.success(`תזכורת נשלחה ל-${nameById[userId] ?? userId}`);
    } catch (err) {
      toast.error("שגיאה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setSending(null);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Done */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">
              ביצעו ({done.length})
            </p>
            {done.length === 0 ? (
              <p className="text-xs text-muted-foreground">אף אחד עדיין לא ביצע</p>
            ) : (
              <ul className="space-y-1.5">
                {done.map((id) => (
                  <li key={id} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {nameById[id] ?? id}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pending */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-red-500 mb-2">
              לא ביצעו ({pending.length})
            </p>
            {pending.length === 0 ? (
              <p className="text-xs text-muted-foreground">כולם ביצעו!</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((id) => (
                  <li key={id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <X className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      {nameById[id] ?? id}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] px-2 gap-1 border-orange-400/50 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 shrink-0"
                      disabled={sending === id}
                      onClick={() => sendReminder(id)}
                    >
                      {sending === id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Send className="h-3 w-3" />
                      }
                      תזכורת דחופה
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TasksManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [targetAll, setTargetAll] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/tasks");
    if (res.ok) {
      const data = await res.json() as { tasks: Task[]; profiles: Profile[] };
      setTasks(data.tasks);
      setProfiles(data.profiles);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!title.trim()) { toast.error("יש להזין כותרת"); return; }
    if (!dueDate) { toast.error("יש לבחור תאריך יעד"); return; }
    if (!targetAll && selectedUsers.length === 0) { toast.error("יש לבחור לפחות נציג אחד"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          due_date: dueDate,
          priority,
          target_all: targetAll,
          target_user_ids: targetAll ? [] : selectedUsers,
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      toast.success("המשימה נוצרה");
      setTitle(""); setDescription(""); setDueDate("");
      setPriority("normal"); setTargetAll(true); setSelectedUsers([]);
      load();
    } catch (err) {
      toast.error("שגיאה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/tasks/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("המשימה נמחקה"); load(); }
    else toast.error("שגיאה במחיקה");
  }

  function toggleUser(uid: string) {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const totalFor = (task: Task) =>
    task.target_all ? profiles.length : task.targetUserIds.length;

  return (
    <div className="space-y-6">
      <CompletionDialog
        task={selectedTask}
        profiles={profiles}
        onClose={() => setSelectedTask(null)}
      />

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            משימה חדשה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">כותרת המשימה *</Label>
            <Input
              id="task-title"
              placeholder="לדוגמה: מלא טופס דוח מכירות שבועי"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">תיאור (אופציונלי)</Label>
            <Textarea
              id="task-desc"
              placeholder="פרטים נוספים למשימה..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none text-sm"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">תאריך יעד *</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={saving}
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>דחיפות</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as "low" | "normal" | "high")}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="normal">רגילה</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>מיועד ל</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={targetAll}
                  onChange={() => { setTargetAll(true); setSelectedUsers([]); }}
                  disabled={saving}
                />
                <Users className="h-4 w-4" />
                כל הנציגים
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={!targetAll}
                  onChange={() => setTargetAll(false)}
                  disabled={saving}
                />
                <User className="h-4 w-4" />
                נציגים ספציפיים
              </label>
            </div>

            {!targetAll && (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-border p-3">
                {profiles.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedUsers.includes(p.id)}
                      onCheckedChange={() => toggleUser(p.id)}
                      disabled={saving}
                    />
                    {p.nickname ?? p.full_name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleCreate} disabled={saving} className="gap-2">
            <Plus className="h-4 w-4" />
            {saving ? "יוצר..." : "צור משימה"}
          </Button>
        </CardContent>
      </Card>

      {/* Tasks list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-4 w-4" />
            משימות פעילות ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">טוען...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">אין משימות פעילות</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const isOverdue = task.due_date < today;
                const total = totalFor(task);
                const done = task.completionCount;
                const allDone = total > 0 && done >= total;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4",
                      isOverdue ? "border-red-500/30 bg-red-500/[0.03]" : "border-border"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <p className={cn(
                          "text-sm font-semibold",
                          isOverdue && "text-red-600 dark:text-red-400"
                        )}>
                          {task.title}
                        </p>
                        <Badge className={cn("text-[10px] px-1.5 h-4 border-0", PRIORITY_BADGE[task.priority])}>
                          {PRIORITY_LABELS[task.priority]}
                        </Badge>
                      </div>

                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          יעד: {task.due_date}{isOverdue && " ⚠"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {task.target_all ? "כל הנציגים" : task.targetUserNames.join(", ")}
                        </span>

                        {/* Clickable completion counter → opens dialog */}
                        <button
                          className={cn(
                            "text-xs font-semibold underline-offset-2 hover:underline transition-colors cursor-pointer",
                            allDone
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          )}
                          onClick={() => setSelectedTask(task)}
                          title="לחץ לפרטים"
                        >
                          {done}/{total} ביצעו
                        </button>
                      </div>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0 mt-0.5"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
