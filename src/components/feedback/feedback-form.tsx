"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Sparkles } from "lucide-react";

interface FeedbackFormProps {
  onSubmitted?: () => void;
}

export function FeedbackForm({ onSubmitted }: FeedbackFormProps) {
  const [form, setForm] = useState({ customerName: "", customerPhone: "", notes: "" });
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          notes: form.notes,
        }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success("הבקשה נשלחה!", {
        description: "המנהל יקבל את הבקשה, יעלה את ההקלטה ויחזיר משוב מלא.",
        duration: 6000,
      });
      setForm({ customerName: "", customerPhone: "", notes: "" });
      onSubmitted?.();
    } catch (err) {
      toast.error("שגיאה בשליחה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          בקשת משוב על שיחה
        </CardTitle>
        <CardDescription>
          מלא את פרטי השיחה. המנהל יעלה את הקלטת השיחה ויחזיר לך משוב מלא עם נקודות שיפור ושימור.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fb-customerName">שם לקוח *</Label>
              <Input
                id="fb-customerName"
                placeholder="ישראל ישראלי"
                value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fb-customerPhone">טלפון לקוח *</Label>
              <Input
                id="fb-customerPhone"
                type="tel"
                dir="ltr"
                placeholder="050-0000000"
                value={form.customerPhone}
                onChange={(e) => set("customerPhone", e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-notes">הערות (אופציונלי)</Label>
            <Textarea
              id="fb-notes"
              placeholder="תאר את נקודת הקושי בשיחה, מה הרגשת, מה לא הלך כמצופה..."
              rows={4}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              disabled={loading}
              className="resize-none"
            />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading || !form.customerName.trim() || !form.customerPhone.trim()}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />שולח...</>
            ) : (
              <><Send className="h-4 w-4" />שלח לבקשת משוב</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
