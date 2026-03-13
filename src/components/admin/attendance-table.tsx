"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, Loader2, CalendarClock, RefreshCw } from "lucide-react";

interface AttendanceRecord {
  userId: string;
  displayName: string;
  role: "Admin" | "Rep";
  currentStatus: "clocked_in" | "clocked_out";
  todayMinutes: number;
  weekMinutes: number;
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, "0")}`;
}

function getSundayOfWeek(offset = 0): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay() + offset * 7);
  return d;
}

function weekLabel(sunday: Date): string {
  const friday = new Date(sunday);
  friday.setUTCDate(sunday.getUTCDate() + 5);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "numeric", timeZone: "UTC" };
  return `${sunday.toLocaleDateString("he-IL", opts)} – ${friday.toLocaleDateString("he-IL", opts)}`;
}

export function AttendanceTable() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const sunday = getSundayOfWeek(weekOffset);
  const weekStart = sunday.toISOString().split("T")[0];

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/hr/attendance?weekStart=${weekStart}`);
    if (res.ok) {
      const data = await res.json() as { records: AttendanceRecord[] };
      setRecords(data.records);
    }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const clockedInCount = records.filter((r) => r.currentStatus === "clocked_in").length;
  const isCurrentWeek = weekOffset === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" />
          נוכחות עובדים
          {isCurrentWeek && clockedInCount > 0 && (
            <Badge className="ms-auto bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
              {clockedInCount} במשמרת עכשיו
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <Button size="icon" variant="ghost" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{weekLabel(sunday)}</span>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={load} disabled={loading} title="רענן">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setWeekOffset((w) => w + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-start pb-2 px-2 font-medium">שם</th>
                  <th className="text-center pb-2 px-2 font-medium">סטטוס</th>
                  <th className="text-center pb-2 px-2 font-medium">היום</th>
                  <th className="text-center pb-2 px-2 font-medium">שבוע</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                      אין נתונים לשבוע זה
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.userId} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2">
                        <p className="font-medium leading-tight">{r.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.role === "Admin" ? "מנהל" : "נציג"}
                        </p>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {isCurrentWeek ? (
                          <Badge
                            className={
                              r.currentStatus === "clocked_in"
                                ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
                                : "bg-muted text-muted-foreground border-transparent"
                            }
                          >
                            {r.currentStatus === "clocked_in" ? "במשמרת" : "לא במשמרת"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center tabular-nums font-mono text-sm">
                        {r.todayMinutes > 0 ? formatMinutes(r.todayMinutes) : "—"}
                      </td>
                      <td className="py-3 px-2 text-center tabular-nums font-mono text-sm font-semibold">
                        {r.weekMinutes > 0 ? formatMinutes(r.weekMinutes) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          שעות מחושבות מזוגות כניסה/יציאה · פורמט ש:דד
        </p>
      </CardContent>
    </Card>
  );
}
