"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Lock, Clock4, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];
const TYPES = [
  { value: "normal",      label: "יום רגיל",    color: "bg-primary text-primary-foreground border-primary" },
  { value: "day_off",     label: "יום חופש",    color: "bg-rose-500 text-white border-rose-500" },
  { value: "short_shift", label: "משמרת קצרה",  color: "bg-amber-500 text-white border-amber-500" },
] as const;

type ConstraintType = "normal" | "day_off" | "short_shift";

interface DayState {
  constraintType: ConstraintType;
  shiftStart: string;
  shiftEnd: string;
}

interface FixedShift {
  start: string | null;
  end: string | null;
}

function getIsraelNow() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0");
  return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
}

function getWindow() {
  const ilNow = getIsraelNow();
  const sunday = new Date(ilNow);
  sunday.setDate(ilNow.getDate() - ilNow.getDay());
  sunday.setHours(0, 0, 0, 0);
  const openAt = new Date(sunday);
  openAt.setDate(sunday.getDate() + 2);
  const closeAt = new Date(sunday);
  closeAt.setDate(sunday.getDate() + 4);
  closeAt.setHours(15, 0, 0, 0);
  const nextSunday = new Date(sunday);
  nextSunday.setDate(sunday.getDate() + 7);
  // Use local date components — toISOString() would convert to UTC and can shift the date
  const pad = (n: number) => String(n).padStart(2, "0");
  const nextWeekStart = `${nextSunday.getFullYear()}-${pad(nextSunday.getMonth() + 1)}-${pad(nextSunday.getDate())}`;
  const isOpen = ilNow >= openAt && ilNow <= closeAt;
  return { isOpen, openAt, closeAt, nextWeekStart, nextSunday };
}

function weekLabel(sunday: Date): string {
  const friday = new Date(sunday);
  friday.setDate(sunday.getDate() + 5);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "numeric" };
  return `${sunday.toLocaleDateString("he-IL", opts)} – ${friday.toLocaleDateString("he-IL", opts)}`;
}

function formatCloseAt(closeAt: Date): string {
  return closeAt.toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EMPTY_DAY: DayState = { constraintType: "normal", shiftStart: "09:00", shiftEnd: "17:00" };

export function ShiftForm() {
  const win = getWindow();
  const [days, setDays] = useState<DayState[]>(DAYS.map(() => ({ ...EMPTY_DAY })));
  const [fixedShift, setFixedShift] = useState<FixedShift>({ start: null, end: null });
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const weekStart = win.nextWeekStart;

  const loadConstraints = useCallback(async () => {
    const res = await fetch(`/api/hr/shifts?weekStart=${weekStart}`);
    if (!res.ok) return;
    const data = await res.json() as {
      constraints: { day_of_week: number; constraint_type: string; shift_start: string | null; shift_end: string | null }[];
      fixedShift: FixedShift;
      hasSubmitted: boolean;
    };
    const next = DAYS.map((_, i) => {
      const c = data.constraints.find((x) => x.day_of_week === i);
      if (!c) return { ...EMPTY_DAY };
      return { constraintType: c.constraint_type as ConstraintType, shiftStart: c.shift_start ?? "09:00", shiftEnd: c.shift_end ?? "17:00" };
    });
    setDays(next);
    setFixedShift(data.fixedShift ?? { start: null, end: null });
    setSubmitted(data.hasSubmitted ?? false);
  }, [weekStart]);

  useEffect(() => { loadConstraints(); }, [loadConstraints]);

  function setDay(idx: number, field: keyof DayState, value: string) {
    setDays((prev) => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next; });
  }

  async function handleSave() {
    if (!win.isOpen) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hr/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          days: days.map((d, i) => ({
            dayOfWeek: i,
            constraintType: d.constraintType,
            shiftStart: d.shiftStart || undefined,
            shiftEnd: d.shiftEnd || undefined,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      setSubmitted(true);
      toast.success("האילוצים נשמרו — ניתן לערוך עד יום חמישי ב-15:00");
    } catch (err) {
      toast.error("שגיאה בשמירה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally { setSaving(false); }
  }

  const isReadOnly = !win.isOpen;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" />
          {"אילוצי משמרת — שבוע " + weekLabel(win.nextSunday)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {win.isOpen ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-3 flex items-start gap-3">
            <Clock4 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-sm text-emerald-700 dark:text-emerald-400">
              <strong>חלון שליחת אילוצים פתוח</strong>
              <p className="text-xs mt-0.5 text-emerald-600/80 dark:text-emerald-500">
                {"ניתן לשלוח ולערוך עד " + formatCloseAt(win.closeAt)}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-500/20 bg-zinc-500/[0.06] px-4 py-3 flex items-start gap-3">
            <Lock className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
            <div className="text-sm text-zinc-500">
              <strong>חלון האילוצים סגור</strong>
              <p className="text-xs mt-0.5">ניתן לשלוח אילוצים מיום שלישי עד יום חמישי ב-15:00 (שבוע נוכחי)</p>
            </div>
          </div>
        )}

        {(fixedShift.start || fixedShift.end) && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.05] px-3 py-2 text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <Clock4 className="h-3.5 w-3.5 shrink-0" />
            {"שעות קבועות: "}
            <strong>{(fixedShift.start ?? "?") + " – " + (fixedShift.end ?? "?")}</strong>
            <span className="text-blue-500/60 mr-1">(לכל יום רגיל)</span>
          </div>
        )}

        <div className="space-y-2">
          {DAYS.map((dayName, i) => {
            const day = days[i];
            return (
              <div key={i} className={cn("rounded-xl border border-border p-3 space-y-2.5", isReadOnly && "opacity-70")}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold w-14 shrink-0">{dayName}</p>
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    {TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => setDay(i, "constraintType", t.value)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs border font-medium transition-colors",
                          day.constraintType === t.value
                            ? t.color
                            : "border-border text-muted-foreground hover:bg-muted disabled:cursor-default"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {day.constraintType === "normal" && (fixedShift.start || fixedShift.end) && (
                    <Badge variant="secondary" className="text-xs shrink-0 font-normal">
                      {fixedShift.start + "–" + fixedShift.end}
                    </Badge>
                  )}
                </div>
                {day.constraintType === "short_shift" && (
                  <div className="flex gap-3 items-center ps-1">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">כניסה</Label>
                      <Input type="time" dir="ltr" value={day.shiftStart} onChange={(e) => !isReadOnly && setDay(i, "shiftStart", e.target.value)} readOnly={isReadOnly} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">יציאה</Label>
                      <Input type="time" dir="ltr" value={day.shiftEnd} onChange={(e) => !isReadOnly && setDay(i, "shiftEnd", e.target.value)} readOnly={isReadOnly} className="h-8 text-sm" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {win.isOpen && (
          <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "שומר..." : submitted ? "עדכן אילוצים" : "שלח אילוצים"}
          </Button>
        )}

        {submitted && (
          <p className="text-xs text-center text-emerald-600 dark:text-emerald-400">
            ✓ האילוצים נשלחו למנהל
          </p>
        )}
      </CardContent>
    </Card>
  );
}
