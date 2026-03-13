"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coffee, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface ActiveBreak {
  id: string;
  user_id: string;
  user_name: string;
  started_at: string;
  ends_at: string;
}

const DURATIONS = [5, 10, 15, 20, 25, 30];

function timeLeft(endsAt: string): string {
  const diff = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LiveBreaks() {
  const { user } = useAuth();
  const [breaks, setBreaks] = useState<ActiveBreak[]>([]);
  const [now, setNow] = useState(Date.now());
  const [starting, setStarting] = useState(false);
  const [myBreak, setMyBreak] = useState<ActiveBreak | null>(null);
  const [myTodayMinutes, setMyTodayMinutes] = useState(0);
  const [maxBreakMinutesPerDay, setMaxBreakMinutesPerDay] = useState(35);

  const fetchBreaks = useCallback(async () => {
    const res = await fetch("/api/hr/breaks");
    if (res.ok) {
      const data = await res.json() as {
        breaks: ActiveBreak[];
        myTodayMinutes: number;
        maxBreakMinutesPerDay: number;
      };
      setBreaks(data.breaks);
      setMyBreak(data.breaks.find((b) => b.user_id === user?.id) ?? null);
      setMyTodayMinutes(data.myTodayMinutes);
      setMaxBreakMinutesPerDay(data.maxBreakMinutesPerDay);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBreaks();
    const supabase = createClient();
    const channel = supabase
      .channel("active_breaks_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "active_breaks" }, () => {
        fetchBreaks();
      })
      .subscribe();

    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      void supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, [fetchBreaks]);

  const activeBreaks = breaks.filter((b) => new Date(b.ends_at).getTime() > now);
  const remaining = Math.max(0, maxBreakMinutesPerDay - myTodayMinutes);
  const limitReached = myTodayMinutes >= maxBreakMinutesPerDay;

  async function startBreak(minutes: number) {
    setStarting(true);
    try {
      const res = await fetch("/api/hr/breaks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMinutes: minutes }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      toast.success(`הפסקה של ${minutes} דקות התחילה`);
      fetchBreaks();
    } catch (err) {
      toast.error("שגיאה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setStarting(false);
    }
  }

  async function endBreak() {
    await fetch("/api/hr/breaks", { method: "DELETE" });
    toast.success("ההפסקה הסתיימה");
    fetchBreaks();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Coffee className="h-4 w-4" />
          הפסקות פעילות
          {activeBreaks.length > 0 && (
            <Badge variant="secondary" className="ms-auto">
              {activeBreaks.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* My break controls */}
        {myBreak ? (
          <div className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium">ההפסקה שלך</p>
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 font-mono">
                {timeLeft(myBreak.ends_at)}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={endBreak}>
              <X className="h-4 w-4 me-1" />
              סיים
            </Button>
          </div>
        ) : limitReached ? (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-600 dark:text-rose-400 text-center">
            ניצלת את כל {maxBreakMinutesPerDay} דקות ההפסקה שלך להיום
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">התחל הפסקה:</p>
              <p className="text-xs text-muted-foreground">
                נותרו <span className="font-semibold">{remaining}</span>/{maxBreakMinutesPerDay} דק&apos;
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant="outline"
                  disabled={starting || d > remaining}
                  onClick={() => startBreak(d)}
                  title={d > remaining ? `נותרו רק ${remaining} דקות` : undefined}
                >
                  {d} דק&apos;
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Active breaks list */}
        {activeBreaks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            אין הפסקות פעילות כרגע
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {activeBreaks.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{b.user_name}</span>
                <span className="tabular-nums text-muted-foreground font-mono text-xs">
                  {timeLeft(b.ends_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
