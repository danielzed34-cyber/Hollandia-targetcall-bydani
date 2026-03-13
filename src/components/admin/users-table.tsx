"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, User, Loader2, Pencil, Check, X, Clock } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  nickname: string | null;
  role: "Admin" | "Rep";
  shift_start_fixed: string | null;
  shift_end_fixed: string | null;
  created_at: string;
}

export function UsersTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState<Record<string, string>>({});
  const [editingHours, setEditingHours] = useState<Record<string, { start: string; end: string }>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json() as { users: UserProfile[] };
      setUsers(data.users);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleRole(user: UserProfile) {
    const newRole = user.role === "Admin" ? "Rep" : "Admin";
    setUpdating(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      toast.success(`${user.nickname ?? user.full_name} שונה ל-${newRole === "Admin" ? "מנהל" : "נציג"}`);
    } catch (err) {
      toast.error("שגיאה בעדכון", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setUpdating(null);
    }
  }

  function startEditNickname(user: UserProfile) {
    setEditingNickname((prev) => ({ ...prev, [user.id]: user.nickname ?? "" }));
  }

  function cancelEditNickname(userId: string) {
    setEditingNickname((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  async function saveNickname(user: UserProfile) {
    const draft = editingNickname[user.id] ?? "";
    setUpdating(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, nickname: draft }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      const savedNickname = draft.trim() || null;
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, nickname: savedNickname } : u))
      );
      cancelEditNickname(user.id);
      toast.success(savedNickname ? `שם תצוגה עודכן ל: ${savedNickname}` : "שם תצוגה נמחק");
    } catch (err) {
      toast.error("שגיאה בשמירה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setUpdating(null);
    }
  }

  function startEditHours(user: UserProfile) {
    setEditingHours((prev) => ({
      ...prev,
      [user.id]: { start: user.shift_start_fixed ?? "", end: user.shift_end_fixed ?? "" },
    }));
  }

  function cancelEditHours(userId: string) {
    setEditingHours((prev) => { const next = { ...prev }; delete next[userId]; return next; });
  }

  async function saveHours(user: UserProfile) {
    const draft = editingHours[user.id];
    setUpdating(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          shift_start_fixed: draft.start || null,
          shift_end_fixed: draft.end || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, shift_start_fixed: draft.start || null, shift_end_fixed: draft.end || null }
            : u
        )
      );
      cancelEditHours(user.id);
      toast.success("שעות קבועות עודכנו");
    } catch (err) {
      toast.error("שגיאה בשמירה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          ניהול משתמשים
        </CardTitle>
        <CardDescription>
          הגדר שם תצוגה (nickname) לכל נציג — זה השם שיופיע בתיאום פגישות ובתלונות שירות. שנה תפקיד בין נציג (Rep) למנהל (Admin).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {users.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">אין משתמשים</p>
          )}
          {users.map((u) => {
            const isEditingNick = u.id in editingNickname;
            const isEditingHrs = u.id in editingHours;
            const displayName = u.nickname ?? u.full_name;

            return (
              <div
                key={u.id}
                className="rounded-lg border border-border px-4 py-3 gap-3 space-y-2"
              >
                {/* Top row: avatar + name + role badge + role toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-sm">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{displayName}</p>
                      {u.nickname && (
                        <p className="text-xs text-muted-foreground truncate">{u.full_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={
                        u.role === "Admin"
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-muted text-muted-foreground border-border"
                      }
                    >
                      {u.role === "Admin" ? (
                        <><Shield className="h-3 w-3 me-1" />מנהל</>
                      ) : (
                        <><User className="h-3 w-3 me-1" />נציג</>
                      )}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updating === u.id}
                      onClick={() => toggleRole(u)}
                      className="text-xs"
                    >
                      {updating === u.id && !isEditingNick ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : u.role === "Admin" ? (
                        "הורד לנציג"
                      ) : (
                        "העלה למנהל"
                      )}
                    </Button>
                  </div>
                </div>

                {/* Nickname row */}
                <div className="flex items-center gap-2 ps-12">
                  {isEditingNick ? (
                    <>
                      <Input
                        value={editingNickname[u.id]}
                        onChange={(e) =>
                          setEditingNickname((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveNickname(u);
                          if (e.key === "Escape") cancelEditNickname(u.id);
                        }}
                        placeholder="שם תצוגה (לא חובה)"
                        className="h-7 text-xs"
                        disabled={updating === u.id}
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => saveNickname(u)}
                        disabled={updating === u.id}
                      >
                        {updating === u.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3 text-green-600" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => cancelEditNickname(u.id)}
                        disabled={updating === u.id}
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditNickname(u)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      <Pencil className="h-3 w-3 group-hover:text-primary" />
                      {u.nickname ? (
                        <span>שם תצוגה: <strong>{u.nickname}</strong></span>
                      ) : (
                        <span>הגדר שם תצוגה</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Fixed hours row (Reps only) */}
                {u.role === "Rep" && (
                  <div className="flex items-center gap-2 ps-12">
                    {isEditingHrs ? (
                      <>
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Input type="time" dir="ltr" value={editingHours[u.id].start}
                          onChange={(e) => setEditingHours((prev) => ({ ...prev, [u.id]: { ...prev[u.id], start: e.target.value } }))}
                          className="h-7 w-24 text-xs" disabled={updating === u.id} />
                        <span className="text-xs text-muted-foreground">—</span>
                        <Input type="time" dir="ltr" value={editingHours[u.id].end}
                          onChange={(e) => setEditingHours((prev) => ({ ...prev, [u.id]: { ...prev[u.id], end: e.target.value } }))}
                          className="h-7 w-24 text-xs" disabled={updating === u.id} />
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => saveHours(u)} disabled={updating === u.id}>
                          {updating === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => cancelEditHours(u.id)} disabled={updating === u.id}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <button type="button" onClick={() => startEditHours(u)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group">
                        <Clock className="h-3 w-3 group-hover:text-primary" />
                        {u.shift_start_fixed && u.shift_end_fixed ? (
                          <span>שעות קבועות: <strong>{u.shift_start_fixed} – {u.shift_end_fixed}</strong></span>
                        ) : (
                          <span>הגדר שעות קבועות</span>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
