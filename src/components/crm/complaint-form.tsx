"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useProductivityStore } from "@/stores/productivity-store";
import { BRANCH_NAMES } from "@/config/external-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, RotateCcw, AlertCircle, CheckCircle2 } from "lucide-react";

interface FormState {
  customerName: string;
  phone: string;
  deliveryId: string;
  branch: string;
  complaintDetails: string;
  internalNotes: string;
}

const EMPTY: FormState = {
  customerName: "",
  phone: "",
  deliveryId: "",
  branch: "",
  complaintDetails: "",
  internalNotes: "",
};

export function ComplaintForm() {
  const { profile } = useAuth();
  const { incrementComplaints, complaintsToday } = useProductivityStore();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [lastLogged, setLastLogged] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.branch) {
      toast.error("יש לבחור סניף");
      return;
    }
    if (!form.complaintDetails.trim()) {
      toast.error("יש למלא פרטי תלונה");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repName: profile?.nickname ?? profile?.full_name ?? "לא ידוע",
          customerName: form.customerName,
          phone: form.phone,
          deliveryId: form.deliveryId,
          branch: form.branch,
          complaintDetails: form.complaintDetails,
          internalNotes: form.internalNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      incrementComplaints();
      setLastLogged(`${form.customerName} | ${form.branch}`);
      setForm(EMPTY);

      toast.success("התלונה נרשמה בהצלחה!", {
        description: `${form.customerName} – ${form.branch}`,
        duration: 5000,
      });
    } catch (err) {
      toast.error("שגיאה ברישום התלונה", {
        description: err instanceof Error ? err.message : "נסה שוב",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main form */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            תלונת שירות חדשה
          </CardTitle>
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
                <Label htmlFor="c-customerName">שם לקוח *</Label>
                <Input
                  id="c-customerName"
                  placeholder="ישראל ישראלי"
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">טלפון *</Label>
                <Input
                  id="c-phone"
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

            {/* Row: delivery ID + branch */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-deliveryId">מספר לקוח</Label>
                <Input
                  id="c-deliveryId"
                  placeholder="מספר לקוח"
                  dir="ltr"
                  value={form.deliveryId}
                  onChange={(e) => set("deliveryId", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-branch">סניף *</Label>
                <select
                  id="c-branch"
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

            {/* Complaint details */}
            <div className="space-y-1.5">
              <Label htmlFor="c-details">פרטי תלונה *</Label>
              <Textarea
                id="c-details"
                placeholder="תאר את הבעיה בפירוט…"
                rows={4}
                value={form.complaintDetails}
                onChange={(e) => set("complaintDetails", e.target.value)}
                required
                disabled={loading}
                className="resize-none"
              />
            </div>

            {/* Internal notes */}
            <div className="space-y-1.5">
              <Label htmlFor="c-notes">הערות פנימיות</Label>
              <Textarea
                id="c-notes"
                placeholder="הערות שאינן גלויות ללקוח…"
                rows={2}
                value={form.internalNotes}
                onChange={(e) => set("internalNotes", e.target.value)}
                disabled={loading}
                className="resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button type="submit" className="flex-1 gap-2" variant="destructive" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    שומר…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    רשום תלונה
                  </>
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

      {/* Right panel */}
      <div className="flex flex-col gap-4">
        {/* Today's counter */}
        <Card>
          <CardContent className="pt-6 text-center space-y-1">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive opacity-70" />
            <p className="text-4xl font-bold tabular-nums">{complaintsToday}</p>
            <p className="text-sm text-muted-foreground">תלונות רשמת היום</p>
          </CardContent>
        </Card>

        {/* Last logged */}
        {lastLogged && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                תלונה אחרונה שנרשמה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{lastLogged}</p>
              <Badge variant="secondary" className="mt-2 text-xs">
                נשלח לגיליון
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              הנחיות רישום
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>רשום תלונה בהקדם האפשרי</li>
              <li>פרט את הבעיה בצורה ברורה ומלאה</li>
              <li>הוסף מספר לקוח אם קיים</li>
              <li>התלונה נשמרת בגיליון השירות</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
