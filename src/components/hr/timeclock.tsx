"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Clock } from "lucide-react";

type ClockStatus = "clocked_in" | "clocked_out" | "loading";

function formatTime(date: Date) {
  return date.toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function elapsed(from: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Timeclock() {
  const [status, setStatus] = useState<ClockStatus>("loading");
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/hr/clock");
    if (!res.ok) return;
    const data = await res.json() as { status: ClockStatus; lastEvent: string | null };
    setStatus(data.status);
    setLastEvent(data.lastEvent);
    return data;
  }, []);

  // ── Fetch current clock status + tick every second ──────────────
  useEffect(() => {
    void fetchStatus();
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, [fetchStatus]);


  async function handleClockOut() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/hr/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clock_out" }),
      });
      const data = await res.json() as { success: boolean; status: ClockStatus; timestamp: string };
      if (!res.ok) throw new Error((data as { error?: string }).error);
      setStatus(data.status);
      setLastEvent(data.timestamp);
      toast.success("יציאה נרשמה בהצלחה");
    } catch (err) {
      toast.error("שגיאה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setSubmitting(false);
    }
  }

  const isClockedIn = status === "clocked_in";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          שעון נוכחות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current time */}
        <div className="text-center">
          <p suppressHydrationWarning className="text-4xl font-bold tabular-nums tracking-tight font-mono">
            {formatTime(now)}
          </p>
          <p suppressHydrationWarning className="text-sm text-muted-foreground mt-1">
            {now.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Status badge */}
        <div className="flex justify-center">
          {status === "loading" ? (
            <Badge variant="secondary">טוען...</Badge>
          ) : isClockedIn ? (
            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
              במשמרת · {lastEvent ? elapsed(lastEvent) : "--:--:--"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              לא במשמרת
            </Badge>
          )}
        </div>

        {/* Clock-out button (only when clocked in) */}
        {isClockedIn && (
          <Button
            className="w-full gap-2"
            variant="outline"
            disabled={submitting}
            onClick={handleClockOut}
          >
            <LogOut className="h-4 w-4" />
            רישום יציאה
          </Button>
        )}

        {/* Inactivity notice */}
        {isClockedIn && (
          <p className="text-xs text-center text-muted-foreground">
            ניתוק אוטומטי לאחר 3 שעות ללא פעילות
          </p>
        )}

        {/* Last event info */}
        {lastEvent && !isClockedIn && (
          <p className="text-xs text-center text-muted-foreground">
            יציאה אחרונה:{" "}
            {new Date(lastEvent).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {lastEvent && isClockedIn && (
          <p className="text-xs text-center text-muted-foreground">
            כניסה:{" "}
            {new Date(lastEvent).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
