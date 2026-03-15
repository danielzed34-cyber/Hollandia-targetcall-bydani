"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, Send, Users, User, BookMarked, Save, Trash2, ChevronDown } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  nickname: string | null;
}

interface Broadcast {
  id: string;
  message: string;
  target_all: boolean;
  target_user_name: string | null;
  created_at: string;
}

interface Template {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export function BroadcastSender() {
  const [profiles, setProfiles]       = useState<Profile[]>([]);
  const [broadcasts, setBroadcasts]   = useState<Broadcast[]>([]);
  const [message, setMessage]         = useState("");
  const [targetAll, setTargetAll]     = useState(true);
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending]         = useState(false);

  // Templates
  const [templates, setTemplates]         = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [newTplTitle, setNewTplTitle]     = useState("");
  const [showSaveForm, setShowSaveForm]   = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/broadcasts");
    if (res.ok) {
      const data = await res.json() as { broadcasts: Broadcast[]; profiles: Profile[] };
      setBroadcasts(data.broadcasts);
      setProfiles(data.profiles);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/broadcast-templates");
    if (res.ok) {
      const data = await res.json() as { templates: Template[] };
      setTemplates(data.templates);
    }
  }, []);

  useEffect(() => { void load(); void loadTemplates(); }, [load, loadTemplates]);

  async function handleSend() {
    if (!message.trim()) { toast.error("יש להזין הודעה"); return; }
    if (!targetAll && !targetUserId) { toast.error("יש לבחור מקבל"); return; }

    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          target_all: targetAll,
          target_user_id: targetAll ? undefined : targetUserId,
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      toast.success("ההודעה נשלחה");
      setMessage("");
      void load();
    } catch (err) {
      toast.error("שגיאה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setSending(false);
    }
  }

  async function saveTemplate() {
    if (!newTplTitle.trim()) { toast.error("יש להזין כותרת לתבנית"); return; }
    if (!message.trim()) { toast.error("יש להזין הודעה קודם"); return; }
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/admin/broadcast-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTplTitle.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      toast.success("התבנית נשמרה");
      setNewTplTitle("");
      setShowSaveForm(false);
      void loadTemplates();
    } catch (err) {
      toast.error("שגיאה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setSavingTemplate(false);
    }
  }

  async function deleteTemplate(id: string) {
    const res = await fetch(`/api/admin/broadcast-templates?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("התבנית נמחקה"); void loadTemplates(); }
    else toast.error("שגיאה במחיקת תבנית");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" />
            שידור הודעה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Template picker ─────────────────────────────── */}
          <div>
            <button
              type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <BookMarked className="h-3.5 w-3.5" />
              תבניות מהירות ({templates.length})
              <ChevronDown className={`h-3 w-3 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
            </button>

            {showTemplates && (
              <div className="rounded-xl border border-border bg-muted/30 p-2 space-y-1.5 mb-3">
                {templates.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    אין תבניות שמורות
                  </p>
                )}
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-background transition-colors group"
                  >
                    <button
                      type="button"
                      className="flex-1 text-start text-sm font-medium text-foreground truncate"
                      onClick={() => { setMessage(t.message); setShowTemplates(false); }}
                    >
                      {t.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Message textarea ────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-msg">הודעה</Label>
            <Textarea
              id="broadcast-msg"
              placeholder="תוכן ההודעה לנציגים..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              disabled={sending}
            />
            {/* Save as template */}
            {message.trim() && (
              <div>
                {!showSaveForm ? (
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                  >
                    <Save className="h-3 w-3" />
                    שמור כתבנית
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      placeholder="שם התבנית..."
                      value={newTplTitle}
                      onChange={(e) => setNewTplTitle(e.target.value)}
                      className="h-8 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && saveTemplate()}
                    />
                    <Button size="sm" onClick={saveTemplate} disabled={savingTemplate} className="h-8 text-xs px-3">
                      שמור
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowSaveForm(false)} className="h-8 text-xs px-2">
                      ביטול
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Target ──────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>שלח אל</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={targetAll}
                  onChange={() => { setTargetAll(true); setTargetUserId(""); }}
                  disabled={sending}
                />
                <Users className="h-4 w-4" />
                כל הצוות
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={!targetAll}
                  onChange={() => setTargetAll(false)}
                  disabled={sending}
                />
                <User className="h-4 w-4" />
                נציג ספציפי
              </label>
            </div>

            {!targetAll && (
              <Select value={targetUserId} onValueChange={(v) => setTargetUserId(v ?? "")} disabled={sending}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחר נציג..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nickname ?? p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button onClick={handleSend} disabled={sending} className="gap-2">
            <Send className="h-4 w-4" />
            {sending ? "שולח..." : "שלח הודעה"}
          </Button>
        </CardContent>
      </Card>

      {/* Today's broadcasts log */}
      {broadcasts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              הודעות ששלחתי היום ({broadcasts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {broadcasts.map((b) => (
                <div
                  key={b.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">{b.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {b.target_all ? "כל הצוות" : (b.target_user_name ?? "נציג ספציפי")}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(b.created_at).toLocaleTimeString("he-IL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
