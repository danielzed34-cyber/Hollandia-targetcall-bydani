"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Target, Users, User, CheckCircle2, Trophy, Send, Save } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  nickname: string | null;
}

interface GoalRow {
  id: string;
  goal_type: "team" | "individual";
  target_user_id: string | null;
  target_count: number;
  status: "draft" | "active";
}

interface CountRow {
  user_id: string;
  count: number;
}

export function GoalsManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Draft inputs (uncontrolled until saved)
  const [teamInput, setTeamInput] = useState("");
  const [indivInputs, setIndivInputs] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/goals");
      if (!res.ok) throw new Error();
      const data = await res.json() as { profiles: Profile[]; goals: GoalRow[]; counts: CountRow[] };
      setProfiles(data.profiles);
      setGoals(data.goals);
      setCounts(data.counts);

      // Pre-fill inputs from existing goals
      const tg = data.goals.find((g) => g.goal_type === "team");
      if (tg) setTeamInput(String(tg.target_count));

      const inputs: Record<string, string> = {};
      for (const g of data.goals.filter((g) => g.goal_type === "individual")) {
        if (g.target_user_id) inputs[g.target_user_id] = String(g.target_count);
      }
      setIndivInputs(inputs);
    } catch {
      toast.error("שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isActive = goals.some((g) => g.status === "active");

  const teamGoal = goals.find((g) => g.goal_type === "team");
  const teamCount = counts.reduce((sum, c) => sum + c.count, 0);

  function countFor(userId: string) {
    return counts.find((c) => c.user_id === userId)?.count ?? 0;
  }

  function goalFor(userId: string) {
    return goals.find((g) => g.goal_type === "individual" && g.target_user_id === userId);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const teamGoalVal = parseInt(teamInput);
      const individualGoals = profiles
        .map((p) => ({ userId: p.id, count: parseInt(indivInputs[p.id] ?? "0") || 0 }))
        .filter((ig) => ig.count > 0);

      const res = await fetch("/api/admin/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamGoal: isNaN(teamGoalVal) ? null : teamGoalVal,
          individualGoals,
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      toast.success("יעדים נשמרו כטיוטה");
      void load();
    } catch (err) {
      toast.error("שגיאה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    setActivating(true);
    setConfirmOpen(false);
    try {
      // Save any unsaved inputs first
      const teamGoalVal = parseInt(teamInput);
      const individualGoals = profiles
        .map((p) => ({ userId: p.id, count: parseInt(indivInputs[p.id] ?? "0") || 0 }))
        .filter((ig) => ig.count > 0);

      if (!isNaN(teamGoalVal) || individualGoals.length > 0) {
        const saveRes = await fetch("/api/admin/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamGoal: isNaN(teamGoalVal) ? null : teamGoalVal,
            individualGoals,
          }),
        });
        if (!saveRes.ok) throw new Error((await saveRes.json() as { error: string }).error);
      }

      // Activate
      const res = await fetch("/api/admin/goals?action=activate", { method: "PATCH" });
      const json = await res.json() as { error?: string; sent?: number };
      if (!res.ok) throw new Error(json.error ?? "שגיאה");
      toast.success(`היעדים אושרו ונשלחו! (${json.sent ?? 0} הודעות)`);
      void load();
    } catch (err) {
      toast.error("שגיאה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setActivating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const hasDrafts = goals.some((g) => g.status === "draft");
  const hasInputs = teamInput || Object.values(indivInputs).some((v) => parseInt(v) > 0);

  return (
    <div className="space-y-5">
      {/* ── Status Banner ─────────────────────────────────────── */}
      {isActive && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            יעדים פעילים להיום — עריכה תהיה זמינה מחר
          </p>
        </div>
      )}

      {/* ── Team Goal ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            יעד צוות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-[160px]">
              <Input
                type="number"
                min={1}
                max={999}
                placeholder="מספר פגישות..."
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                disabled={isActive}
                className="text-center text-lg font-bold"
              />
            </div>
            <span className="text-sm text-muted-foreground">פגישות לצוות</span>
            {teamGoal && (
              <Badge variant={isActive ? "default" : "secondary"} className="shrink-0">
                {isActive ? "פעיל" : "טיוטה"}
              </Badge>
            )}
          </div>

          {/* Team progress bar (when active) */}
          {isActive && teamGoal && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>התקדמות צוות</span>
                <span className="font-bold tabular-nums">
                  {teamCount} / {teamGoal.target_count}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (teamCount / teamGoal.target_count) * 100)}%`,
                    background: teamCount >= teamGoal.target_count
                      ? "linear-gradient(90deg, #10b981, #059669)"
                      : "linear-gradient(90deg, #3b82f6, #2563eb)",
                  }}
                />
              </div>
              {teamCount >= teamGoal.target_count && (
                <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" /> הצוות הגיע ליעד! 🎉
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Individual Goals ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            יעדים אישיים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {profiles.map((p) => {
              const name = p.nickname ?? p.full_name;
              const existing = goalFor(p.id);
              const actual = countFor(p.id);
              const target = existing?.target_count ?? 0;
              const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
              const reached = target > 0 && actual >= target;

              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5"
                >
                  {/* Name */}
                  <span className="w-28 shrink-0 text-sm font-medium truncate">{name}</span>

                  {/* Input */}
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    placeholder="יעד"
                    value={indivInputs[p.id] ?? ""}
                    onChange={(e) =>
                      setIndivInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    disabled={isActive}
                    className="w-20 text-center text-sm font-bold h-8"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">פגישות</span>

                  {/* Progress when active */}
                  {isActive && target > 0 ? (
                    <div className="flex-1 space-y-1">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: reached
                              ? "linear-gradient(90deg, #10b981, #059669)"
                              : "linear-gradient(90deg, #3b82f6, #2563eb)",
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {actual} / {target}
                        {reached && " 🏆"}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}

                  {/* Status dot */}
                  {existing && (
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        existing.status === "active" ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Action Buttons ─────────────────────────────────────── */}
      {!isActive && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving || !hasInputs}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "שומר..." : "שמור טיוטה"}
          </Button>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={saving || activating || (!hasDrafts && !hasInputs)}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {activating ? "שולח..." : "אשר ושלח יעדים"}
          </Button>
        </div>
      )}

      {/* ── Confirm Dialog ─────────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              אישור שליחת יעדים
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            היעדים יאושרו ויישלחו לנציגים כהודעה. לא ניתן לערוך אחרי אישור.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>ביטול</Button>
            <Button onClick={() => void handleActivate()} disabled={activating} className="gap-2">
              <Send className="h-4 w-4" />
              אשר ושלח
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
