"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronRight, ChevronLeft, Loader2, CalendarDays, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];

interface RepRow {
  id: string;
  name: string;
  fixedStart: string | null;
  fixedEnd: string | null;
  hasSubmitted: boolean;
  days: { type: string; start: string | null; end: string | null }[];
}

function getSundayOfWeek(offset = 0): Date {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay() + offset * 7);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

function toISO(d: Date) {
  // Use local date components — toISOString() converts to UTC and can shift the date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekLabel(sunday: Date): string {
  const friday = new Date(sunday);
  friday.setDate(sunday.getDate() + 5);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "numeric" };
  return `${sunday.toLocaleDateString("he-IL", opts)} – ${friday.toLocaleDateString("he-IL", opts)}`;
}

/** Strip seconds from HH:MM:SS → HH:MM */
function hhmm(t: string | null): string {
  if (!t) return "";
  return t.replace(/^(\d{2}:\d{2})(:\d{2})?$/, "$1");
}

function cellLabel(day: { type: string; start: string | null; end: string | null }): string {
  if (day.type === "day_off") return "חופש";
  if (day.type === "short_shift") return `${hhmm(day.start)}-${hhmm(day.end)}`;
  if (day.start && day.end) return `${hhmm(day.start)}-${hhmm(day.end)}`;
  return "רגיל";
}

function cellColor(type: string) {
  if (type === "day_off")    return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
  if (type === "short_shift") return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
}

export function ShiftsReview() {
  const [weekOffset, setWeekOffset] = useState(1); // default: next week
  const [reps, setReps] = useState<RepRow[]>([]);
  const [loading, setLoading] = useState(true);

  const sunday = getSundayOfWeek(weekOffset);
  const weekStart = toISO(sunday);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/shifts?weekStart=${weekStart}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as { reps: RepRow[] };
      setReps(data.reps);
    } catch {
      toast.error("שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  function exportCSV() {
    const BOM = "\uFEFF";
    const header = ["שם נציג", "שעות קבועות", ...DAYS_HE].join(",");
    const rows = reps.map((r) => {
      const fixed = r.fixedStart && r.fixedEnd ? `${hhmm(r.fixedStart)}-${hhmm(r.fixedEnd)}` : "";
      const dayCells = r.days.map((d) => `"${cellLabel(d)}"`);
      return [`"${r.name}"`, `"${fixed}"`, ...dayCells].join(",");
    });
    const csv = BOM + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shifts-${weekStart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const submittedCount = reps.filter((r) => r.hasSubmitted).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            סידור עבודה
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setWeekOffset((w) => w - 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">{weekLabel(sunday)}</span>
            <Button size="icon" variant="ghost" onClick={() => setWeekOffset((w) => w + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV} disabled={loading || reps.length === 0}>
            <Download className="h-4 w-4" />
            ייצוא Excel (CSV)
          </Button>
        </div>

        {/* Submission status */}
        {!loading && (
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span>{submittedCount} / {reps.length} נציגים שלחו אילוצים</span>
            <div className="flex gap-1">
              {reps.map((r) => (
                <span key={r.id} title={r.name}>
                  {r.hasSubmitted
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <Circle className="h-4 w-4 text-zinc-400" />
                  }
                </span>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : reps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">אין נציגים</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right pb-2 pe-3 font-semibold text-muted-foreground text-xs">שם נציג</th>
                  <th className="text-center pb-2 px-1 font-semibold text-muted-foreground text-xs">שעות קבועות</th>
                  {DAYS_HE.map((d) => (
                    <th key={d} className="text-center pb-2 px-2 font-semibold text-muted-foreground text-xs">{d}</th>
                  ))}
                  <th className="text-center pb-2 px-1 font-semibold text-muted-foreground text-xs">שלח</th>
                </tr>
              </thead>
              <tbody>
                {reps.map((rep) => (
                  <tr key={rep.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 pe-3 font-medium">{rep.name}</td>
                    <td className="py-2 px-1 text-center text-xs text-muted-foreground">
                      {rep.fixedStart && rep.fixedEnd ? `${hhmm(rep.fixedStart)}-${hhmm(rep.fixedEnd)}` : "—"}
                    </td>
                    {rep.days.map((day, di) => (
                      <td key={di} className="py-2 px-2 text-center">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${cellColor(day.type)}`}>
                          {cellLabel(day)}
                        </span>
                      </td>
                    ))}
                    <td className="py-2 px-1 text-center">
                      {rep.hasSubmitted
                        ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-xs">כן</Badge>
                        : <Badge variant="outline" className="text-muted-foreground text-xs">לא</Badge>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
