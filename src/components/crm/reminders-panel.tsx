"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { BRANCH_MAP } from "@/config/external-links";
import { buildReminderWAMessage } from "@/lib/whatsapp";
import type { ReminderAppointment } from "@/app/api/reminders/route";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, RefreshCw, MessageCircle,
  Pencil, Check, X, Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SendState = "idle" | "previewing" | "editing" | "sending" | "sent";

function AppointmentRow({ apt }: { apt: ReminderAppointment }) {
  const [sendState, setSendState] = useState<SendState>("idle");
  const [editedMsg, setEditedMsg] = useState("");

  const branchInfo = BRANCH_MAP[apt.branch];
  const address = branchInfo?.address ?? apt.branch;

  const defaultMsg = buildReminderWAMessage({
    customerName: apt.customerName,
    branch: apt.branch,
    address,
    meetingDate: apt.meetingDate,
    meetingTime: apt.meetingTime,
  });

  const isSending = sendState === "sending";

  function openPreview() {
    setEditedMsg(defaultMsg);
    setSendState("previewing");
  }

  function startEdit() { setSendState("editing"); }
  function cancelPreview() { setSendState("idle"); }

  async function send(message: string) {
    setSendState("sending");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: apt.phone, message }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success(`תזכורת נשלחה ל-${apt.customerName}`);
      setSendState("sent");
    } catch (err) {
      toast.error("שגיאה בשליחה", { description: err instanceof Error ? err.message : "נסה שוב" });
      setSendState("previewing");
    }
  }

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      {/* Row header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-sm">{apt.customerName}</p>
          <p className="text-xs text-muted-foreground" dir="ltr">{apt.phone}</p>
          <p className="text-xs text-muted-foreground">
            {apt.branch} · {apt.meetingDate} · {apt.meetingTime}
          </p>
          {apt.repName && (
            <p className="text-xs text-muted-foreground">נציג: {apt.repName}</p>
          )}
        </div>

        <div className="shrink-0">
          {sendState === "idle" && (
            <Button size="sm" className="gap-1.5 text-xs" onClick={openPreview}>
              <MessageCircle className="h-3 w-3" />
              שלח תזכורת
            </Button>
          )}
          {sendState === "sent" && (
            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
              <Check className="h-2.5 w-2.5 me-0.5" />
              נשלח
            </Badge>
          )}
        </div>
      </div>

      {/* Preview / Edit panel */}
      {(sendState === "previewing" || sendState === "editing" || sendState === "sending") && (
        <div className="space-y-2 border-t border-border pt-2">
          {sendState === "editing" ? (
            <Textarea
              value={editedMsg}
              onChange={(e) => setEditedMsg(e.target.value)}
              rows={8}
              className="text-xs font-mono resize-none"
              disabled={isSending}
              dir="rtl"
              autoFocus
            />
          ) : (
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded p-2">
              {editedMsg}
            </pre>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => send(editedMsg)}
              disabled={isSending}
            >
              {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              שלח
            </Button>

            {sendState !== "editing" && (
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={startEdit} disabled={isSending}>
                <Pencil className="h-3 w-3" />
                ערוך
              </Button>
            )}

            <Button size="sm" variant="outline" className="gap-1.5" onClick={cancelPreview} disabled={isSending}>
              <X className="h-3 w-3" />
              {sendState === "editing" ? "ביטול" : "סגור"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RemindersPanel() {
  const [reminders, setReminders] = useState<ReminderAppointment[]>([]);
  const [targetDates, setTargetDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json() as { reminders?: ReminderAppointment[]; targetDates?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setReminders(data.reminders ?? []);
      setTargetDates(data.targetDates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group by date
  const byDate: Record<string, ReminderAppointment[]> = {};
  for (const apt of reminders) {
    if (!byDate[apt.meetingDate]) byDate[apt.meetingDate] = [];
    byDate[apt.meetingDate].push(apt);
  }

  const dateLabel = (index: number, dateStr: string) => {
    const isThursday = new Date().getDay() === 4;
    if (index === 0) return `היום — ${dateStr}`;
    if (isThursday && index === 1) return `מחר (שישי) — ${dateStr}`;
    if (isThursday && index === 2) return `ראשון — ${dateStr}`;
    return `מחר — ${dateStr}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              תזכורות WhatsApp ללקוחות
            </CardTitle>
            <CardDescription>
              פגישות היום ומחר — לחץ שלח תזכורת כדי לשלוח הודעת WhatsApp ללקוח
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            טוען פגישות...
          </div>
        ) : error ? (
          <div className="text-sm text-destructive py-4">{error}</div>
        ) : reminders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            אין פגישות קרובות ל-{targetDates.join(" / ")}
          </p>
        ) : (
          <div className="space-y-5">
            {targetDates.map((date, i) => {
              const apts = byDate[date];
              if (!apts?.length) return null;
              return (
                <div key={date} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {dateLabel(i, date)} ({apts.length})
                  </p>
                  {apts.map((apt, j) => (
                    <AppointmentRow key={`${apt.customerName}-${apt.meetingDate}-${j}`} apt={apt} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
