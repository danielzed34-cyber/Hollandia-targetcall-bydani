"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, Send, Users, User } from "lucide-react";

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

export function BroadcastSender() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [message, setMessage] = useState("");
  const [targetAll, setTargetAll] = useState(true);
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/broadcasts");
    if (res.ok) {
      const data = await res.json() as { broadcasts: Broadcast[]; profiles: Profile[] };
      setBroadcasts(data.broadcasts);
      setProfiles(data.profiles);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      load();
    } catch (err) {
      toast.error("שגיאה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setSending(false);
    }
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
          </div>

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
              <Select value={targetUserId} onValueChange={setTargetUserId} disabled={sending}>
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
