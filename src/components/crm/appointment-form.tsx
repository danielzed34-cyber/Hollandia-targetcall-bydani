"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useProductivityStore } from "@/stores/productivity-store";
import { BRANCH_NAMES, BRANCH_MAP } from "@/config/external-links";
import { buildHollandiaWAMessage } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, RotateCcw, CalendarCheck, MessageCircle, Check, X, Pencil } from "lucide-react";

interface FormState {
  customerName: string;
  phone: string;
  idNumber: string;
  branch: string;
  meetingDate: string;
  meetingTime: string;
  notes: string;
}

const EMPTY: FormState = {
  customerName: "",
  phone: "",
  idNumber: "",
  branch: "",
  meetingDate: "",
  meetingTime: "",
  notes: "",
};

/** Returns today's date as YYYY-MM-DD for the date input min attribute */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

interface PendingWA {
  phone: string;
  message: string;
}

export function AppointmentForm() {
  const { profile } = useAuth();
  const { incrementAppointments, appointmentsToday } = useProductivityStore();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [lastBooked, setLastBooked] = useState<string | null>(null);

  // WhatsApp confirmation state
  const [pendingWA, setPendingWA] = useState<PendingWA | null>(null);
  const [editingWA, setEditingWA] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");
  const [sendingWA, setSendingWA] = useState(false);

  // Animation state
  const [counterPop, setCounterPop] = useState(false);
  const [counterFlash, setCounterFlash] = useState(false);
  const [showGoalCelebration, setShowGoalCelebration] = useState(false);
  const [personalGoal, setPersonalGoal] = useState<number | null>(null);
  const celebratedRef = useRef(false);

  // Fetch goal once on mount
  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.ok ? r.json() : null)
      .then((d: { personalGoal: number | null } | null) => {
        if (d?.personalGoal) setPersonalGoal(d.personalGoal);
      })
      .catch(() => {});
  }, []);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.branch) {
      toast.error("יש לבחור סניף");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repName: profile?.nickname ?? profile?.full_name ?? "לא ידוע",
          customerName: form.customerName,
          phone: form.phone,
          idNumber: form.idNumber,
          branch: form.branch,
          meetingDate: form.meetingDate,
          meetingTime: form.meetingTime,
          notes: form.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Build WhatsApp message preview
      const branchInfo = BRANCH_MAP[form.branch];
      const address = branchInfo?.address ?? form.branch;
      const waMessage = buildHollandiaWAMessage({
        customerName: form.customerName,
        branch: form.branch,
        address,
        meetingDate: form.meetingDate,
        meetingTime: form.meetingTime,
      });

      incrementAppointments();
      const newCount = appointmentsToday + 1;
      setLastBooked(`${form.customerName} | ${form.branch} | ${form.meetingDate} ${form.meetingTime}`);
      setForm(EMPTY);

      // ── Per-appointment animation ──────────────────────────
      setCounterPop(true);
      setCounterFlash(true);
      setTimeout(() => setCounterPop(false), 500);
      setTimeout(() => setCounterFlash(false), 800);

      import("canvas-confetti").then(({ default: confetti }) => {
        // Mini burst from the counter area
        void confetti({
          particleCount: 18,
          spread: 60,
          origin: { x: 0.82, y: 0.5 },
          startVelocity: 30,
          gravity: 0.9,
          colors: ["#4FA8FF", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"],
        });
      }).catch(() => {});

      // ── Goal reached celebration ───────────────────────────
      if (personalGoal && newCount >= personalGoal && !celebratedRef.current) {
        celebratedRef.current = true;
        const today = new Date().toISOString().split("T")[0];
        try { sessionStorage.setItem(`goal_celebrated_${today}`, "1"); } catch { /* ignore */ }

        setTimeout(() => setShowGoalCelebration(true), 400);
        setTimeout(() => setShowGoalCelebration(false), 5500);

        import("canvas-confetti").then(({ default: confetti }) => {
          // Fireworks sequence
          const fire = (opts: Parameters<typeof confetti>[0]) => void confetti(opts);
          setTimeout(() => fire({ particleCount: 150, spread: 80, origin: { x: 0.3, y: 0.6 }, colors: ["#fbbf24", "#f59e0b", "#fff"] }), 500);
          setTimeout(() => fire({ particleCount: 150, spread: 80, origin: { x: 0.7, y: 0.6 }, colors: ["#34d399", "#10b981", "#fff"] }), 750);
          setTimeout(() => fire({ particleCount: 100, spread: 100, origin: { x: 0.5, y: 0.3 }, colors: ["#f472b6", "#a78bfa", "#fff"] }), 1100);
          setTimeout(() => fire({ particleCount: 80,  spread: 60,  origin: { x: 0.2, y: 0.5 }, colors: ["#4FA8FF", "#60a5fa"] }), 1500);
          setTimeout(() => fire({ particleCount: 80,  spread: 60,  origin: { x: 0.8, y: 0.5 }, colors: ["#fbbf24", "#f59e0b"] }), 1800);
        }).catch(() => {});
      }

      // Show WA confirmation panel
      setPendingWA({ phone: form.phone, message: waMessage });
      setEditingWA(false);
      setEditedMessage(waMessage);

      toast.success("הפגישה נקבעה בהצלחה!", {
        description: `${form.customerName} – ${form.meetingDate} ב-${form.meetingTime}`,
        duration: 5000,
      });
    } catch (err) {
      toast.error("שגיאה בשמירת הפגישה", {
        description: err instanceof Error ? err.message : "נסה שוב",
      });
    } finally {
      setLoading(false);
    }
  }

  async function sendWA(message: string) {
    if (!pendingWA) return;
    setSendingWA(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: pendingWA.phone, message }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success("הודעת WhatsApp נשלחה ללקוח!");
    } catch (err) {
      toast.error("שגיאה בשליחת WhatsApp", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setSendingWA(false);
      setPendingWA(null);
      setEditingWA(false);
    }
  }

  function dismissWA() {
    setPendingWA(null);
    setEditingWA(false);
  }

  const firstName = (profile?.nickname ?? profile?.full_name)?.split(" ")[0] ?? "";

  return (
    <div className="relative grid gap-6 lg:grid-cols-3">

      {/* ── Goal celebration overlay ───────────────────────── */}
      {showGoalCelebration && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
          <div
            className="pointer-events-auto flex flex-col items-center gap-4 rounded-3xl px-12 py-10 text-center"
            onClick={() => setShowGoalCelebration(false)}
            style={{
              background: "linear-gradient(135deg, #0D2242 0%, #0A1530 100%)",
              border: "2px solid rgba(201,168,76,0.7)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 80px rgba(201,168,76,0.25)",
              animation: "goalPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            <div style={{ fontSize: "72px", lineHeight: 1, animation: "spin 0.6s ease-out" }}>🏆</div>
            <div>
              <p className="text-3xl font-black text-white">הגעת ליעד!</p>
              <p className="text-lg font-bold mt-1" style={{ color: "#C9A84C" }}>
                {appointmentsToday + 1} / {personalGoal} פגישות
              </p>
            </div>
            <p className="text-base text-blue-200/70">כל הכבוד {firstName}! 🎉</p>
            <p className="text-xs text-white/30 mt-1">לחץ לסגור</p>
          </div>
          <style>{`
            @keyframes goalPop {
              0%   { transform: scale(0.3) rotate(-10deg); opacity: 0; }
              60%  { transform: scale(1.08) rotate(2deg);  opacity: 1; }
              100% { transform: scale(1)    rotate(0deg);  opacity: 1; }
            }
            @keyframes spin {
              0%   { transform: rotate(-20deg) scale(0.5); }
              100% { transform: rotate(0deg)   scale(1);   }
            }
          `}</style>
        </div>
      )}
      {/* ── Main form ──────────────────────────────────── */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">קביעת פגישה חדשה</CardTitle>
          <CardDescription>כל השדות המסומנים ב-* הם חובה</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Rep name — read only */}
            <div className="space-y-1.5">
              <Label>שם נציג</Label>
              <Input
                value={profile?.nickname ?? profile?.full_name ?? "טוען..."}
                readOnly
                className="bg-muted/50 cursor-default"
              />
            </div>

            {/* Row: customer + phone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customerName">שם לקוח *</Label>
                <Input
                  id="customerName"
                  placeholder="ישראל ישראלי"
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">טלפון *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="050-0000000"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Row: ID + Branch */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="idNumber">מספר לקוח *</Label>
                <Input
                  id="idNumber"
                  placeholder="000000000"
                  dir="ltr"
                  maxLength={9}
                  value={form.idNumber}
                  onChange={(e) => set("idNumber", e.target.value.replace(/\D/g, ""))}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch">סניף *</Label>
                <select
                  id="branch"
                  value={form.branch}
                  onChange={(e) => set("branch", e.target.value)}
                  required
                  disabled={loading}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:text-foreground"
                >
                  <option value="" className="bg-background text-foreground">בחר סניף…</option>
                  {BRANCH_NAMES.map((name) => (
                    <option key={name} value={name} className="bg-background text-foreground">
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row: date + time */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="meetingDate">תאריך פגישה *</Label>
                <Input
                  id="meetingDate"
                  type="date"
                  dir="ltr"
                  min={todayISO()}
                  value={form.meetingDate}
                  onChange={(e) => set("meetingDate", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meetingTime">שעת פגישה *</Label>
                <Input
                  id="meetingTime"
                  type="time"
                  dir="ltr"
                  value={form.meetingTime}
                  onChange={(e) => set("meetingTime", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                placeholder="הערות נוספות לפגישה…"
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                disabled={loading}
                className="resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />שומר…</>
                ) : (
                  <><Send className="h-4 w-4" />קבע פגישה</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(EMPTY)}
                disabled={loading}
                title="נקה טופס"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Right panel ────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* WhatsApp confirmation panel */}
        {pendingWA && (
          <Card className="border-green-500/40 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                <MessageCircle className="h-4 w-4" />
                העבר הודעת WhatsApp ללקוח?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Message preview / edit */}
              {editingWA ? (
                <Textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  rows={10}
                  className="text-xs font-mono resize-none"
                  disabled={sendingWA}
                  dir="rtl"
                />
              ) : (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded p-2">
                  {pendingWA.message}
                </pre>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {/* כן / שלח */}
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => sendWA(editingWA ? editedMessage : pendingWA.message)}
                  disabled={sendingWA}
                >
                  {sendingWA ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {editingWA ? "שלח" : "כן"}
                </Button>

                {/* ערוך (only shown before editing) */}
                {!editingWA && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => { setEditingWA(true); setEditedMessage(pendingWA.message); }}
                    disabled={sendingWA}
                  >
                    <Pencil className="h-3 w-3" />
                    ערוך
                  </Button>
                )}

                {/* לא / ביטול */}
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={dismissWA}
                  disabled={sendingWA}
                >
                  <X className="h-3 w-3" />
                  {editingWA ? "ביטול" : "לא"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's counter */}
        <Card
          className="transition-all duration-300 overflow-hidden"
          style={{
            boxShadow: counterFlash
              ? "0 0 0 3px #34d399, 0 8px 32px rgba(52,211,153,0.3)"
              : undefined,
            border: counterFlash ? "1px solid #34d399" : undefined,
          }}
        >
          <CardContent className="pt-6 text-center space-y-1">
            <CalendarCheck
              className="mx-auto h-8 w-8 opacity-80"
              style={{ color: counterFlash ? "#34d399" : undefined, transition: "color 0.3s" }}
            />
            <p
              className="text-4xl font-bold tabular-nums"
              style={{
                transform: counterPop ? "scale(1.45)" : "scale(1)",
                transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                display: "inline-block",
                color: counterFlash ? "#34d399" : undefined,
              }}
            >
              {appointmentsToday}
            </p>
            {personalGoal && (
              <p className="text-xs font-semibold text-muted-foreground">
                מתוך {personalGoal} יעד
              </p>
            )}
            <p className="text-sm text-muted-foreground">פגישות קבעת היום</p>
          </CardContent>
        </Card>

        {/* Last booked */}
        {lastBooked && !pendingWA && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                פגישה אחרונה שנקבעה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{lastBooked}</p>
              <Badge variant="secondary" className="mt-2 text-xs">
                נשלח לגיליון
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Quick tips */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              טיפים מהירים
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>לחץ על נקה לאחר כל פגישה</li>
              <li>הפגישה נשמרת בגיליון הסניף ובלוג הראשי</li>
              <li>לאחר הקביעה תישאל אם לשלוח WhatsApp ללקוח</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
