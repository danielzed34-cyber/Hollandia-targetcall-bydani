"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Bot, Save, Loader2, RefreshCw } from "lucide-react";

interface Settings {
  id: string;
  system_prompt: string;
  daily_tip: string;
  max_breaks_per_day: number;
  max_break_minutes_per_day: number;
  updated_at: string;
}

export function AIMentorSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [dailyTip, setDailyTip] = useState("");
  const [maxBreakMinutesPerDay, setMaxBreakMinutesPerDay] = useState(35);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = await res.json() as { settings: Settings | null };
      if (data.settings) {
        setSettings(data.settings);
        setSystemPrompt(data.settings.system_prompt);
        setDailyTip(data.settings.daily_tip);
        setMaxBreakMinutesPerDay(data.settings.max_break_minutes_per_day ?? 35);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, dailyTip, maxBreakMinutesPerDay }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      toast.success("הגדרות המנטור נשמרו");
      load();
    } catch (err) {
      toast.error("שגיאה בשמירה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" />
          הגדרות מנטור AI
        </CardTitle>
        <CardDescription>
          הוסף הנחיות מותאמות אישית שיתווספו לפרומפט הבסיסי של המנטור. הטיפ היומי מוצג בדף ראשי.
          {settings && (
            <span className="block mt-1 text-xs text-muted-foreground/60">
              עדכון אחרון: {new Date(settings.updated_at).toLocaleString("he-IL")}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ai-prompt">הרחבת פרומפט (system prompt נוסף)</Label>
          <Textarea
            id="ai-prompt"
            placeholder="לדוגמה: המוצרים שאנחנו מוכרים הם... המחיר הממוצע הוא... היה תמיד חיובי ומוטיבציוני..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="resize-none text-sm"
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">
            הטקסט כאן יתווסף לאחר הפרומפט הבסיסי של הולנדיה בכל שיחה עם המנטור.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-tip">טיפ יומי (לדף ראשי)</Label>
          <Input
            id="ai-tip"
            placeholder="לדוגמה: זכרו – כל לקוח הוא הזדמנות חדשה!"
            value={dailyTip}
            onChange={(e) => setDailyTip(e.target.value)}
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">
            טיפ קצר שיוצג לנציגים בדף הבית.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="max-break-minutes">מגבלת זמן הפסקות יומית לנציג (דקות)</Label>
          <Input
            id="max-break-minutes"
            type="number"
            min={5}
            max={240}
            value={maxBreakMinutesPerDay}
            onChange={(e) => setMaxBreakMinutesPerDay(Math.max(5, parseInt(e.target.value) || 35))}
            disabled={saving}
            className="w-24"
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">
            ברירת מחדל: 35. הנציג יכול לקחת כמה הפסקות שירצה כל עוד הסך לא עולה על המגבלה.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "שומר..." : "שמור הגדרות"}
          </Button>
          <Button variant="outline" onClick={load} disabled={loading || saving} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            רענן
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
