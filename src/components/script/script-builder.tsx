"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wand2, Sparkles, Send, CheckCircle2, XCircle, Clock, FileText, Printer, Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ScriptStatus = "draft" | "pending" | "approved" | "rejected";

interface CallScript {
  id: string;
  rep_id: string;
  rep_name: string;
  status: ScriptStatus;
  admin_note: string | null;
  section_1: string;
  section_2: string;
  section_3: string;
  section_4: string;
  section_5: string;
  section_6: string;
  updated_at: string;
}

const SECTIONS = [
  { key: "section_1" as const, title: "פתיחת השיחה",           subtitle: "איך אתה מציג את עצמך ומתחיל את השיחה" },
  { key: "section_2" as const, title: "התחברות רגשית",          subtitle: "בניית אמון וחיבור עם הלקוח" },
  { key: "section_3" as const, title: "הצגת הערך והחשיבות",     subtitle: "למה ריהוט הולנדיה מיוחד" },
  { key: "section_4" as const, title: "הצגת ההטבה",             subtitle: "ההצעה הספציפית שמציעים ללקוח" },
  { key: "section_5" as const, title: "קביעת פגישה",             subtitle: "הנעה לפגישה בסניף" },
  { key: "section_6" as const, title: "סיכום השיחה",            subtitle: "סיום מקצועי וחיובי" },
];

const STATUS_CONFIG: Record<ScriptStatus, { label: string; icon: React.ElementType; className: string }> = {
  draft:    { label: "טיוטה",       icon: FileText,      className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  pending:  { label: "ממתין לאישור", icon: Clock,         className: "bg-amber-500/15 text-amber-500 border-amber-500/20" },
  approved: { label: "מאושר",       icon: CheckCircle2,   className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20" },
  rejected: { label: "נדחה",        icon: XCircle,        className: "bg-rose-500/15 text-rose-500 border-rose-500/20" },
};

type SectionKey = "section_1"|"section_2"|"section_3"|"section_4"|"section_5"|"section_6";

export function ScriptBuilder() {
  const { profile } = useAuth();

  const [script, setScript] = useState<CallScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Local editable content
  const [sections, setSections] = useState<Record<SectionKey, string>>({
    section_1: "", section_2: "", section_3: "",
    section_4: "", section_5: "", section_6: "",
  });

  // AI dialog state (edit mode)
  const [aiDialog, setAiDialog] = useState<{ open: boolean; key: SectionKey | null }>({ open: false, key: null });
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Per-section suggest loading
  const [suggestLoading, setSuggestLoading] = useState<Partial<Record<SectionKey, boolean>>>({});

  const fetchScript = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/script");
      const json = await res.json() as { script: CallScript | null };
      if (json.script) {
        setScript(json.script);
        setSections({
          section_1: json.script.section_1,
          section_2: json.script.section_2,
          section_3: json.script.section_3,
          section_4: json.script.section_4,
          section_5: json.script.section_5,
          section_6: json.script.section_6,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchScript(); }, [fetchScript]);

  const isEditable = !script || script.status === "draft" || script.status === "rejected";
  const isPending  = script?.status === "pending";
  const isApproved = script?.status === "approved";

  function handleNewScript() {
    setScript(null);
    setSections({ section_1: "", section_2: "", section_3: "", section_4: "", section_5: "", section_6: "" });
  }

  async function handleSave() {
    setSaving(true);
    try {
      let res: Response;
      if (!script) {
        res = await fetch("/api/script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sections),
        });
      } else {
        res = await fetch(`/api/script/${script.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sections),
        });
      }
      const json = await res.json() as { script: CallScript; error?: string };
      if (!res.ok) { toast.error(json.error ?? "שגיאה בשמירה"); return; }
      setScript(json.script);
      toast.success("התסריט נשמר");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!script) { toast.error("שמור קודם את התסריט"); return; }
    setSubmitting(true);
    try {
      // Always save current section content before changing status
      const saveRes = await fetch(`/api/script/${script.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sections),
      });
      if (!saveRes.ok) {
        const saveJson = await saveRes.json() as { error?: string };
        toast.error(saveJson.error ?? "שגיאה בשמירה");
        return;
      }

      const res = await fetch(`/api/script/${script.id}/submit`, { method: "POST" });
      const json = await res.json() as { script: CallScript; error?: string };
      if (!res.ok) { toast.error(json.error ?? "שגיאה בשליחה"); return; }
      setScript(json.script);
      setSections({
        section_1: json.script.section_1,
        section_2: json.script.section_2,
        section_3: json.script.section_3,
        section_4: json.script.section_4,
        section_5: json.script.section_5,
        section_6: json.script.section_6,
      });
      toast.success("התסריט נשלח לאישור המנהל");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAiEdit() {
    if (!aiDialog.key || !script) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/script/${script.id}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionKey: aiDialog.key,
          instruction: aiInstruction,
          currentText: sections[aiDialog.key],
        }),
      });
      const json = await res.json() as { text?: string; error?: string; quota?: boolean };
      if (!res.ok || !json.text) {
        toast.error(json.error ?? "שגיאת AI", { duration: json.quota ? 8000 : 4000 });
        return;
      }
      setSections((prev) => ({ ...prev, [aiDialog.key!]: json.text! }));
      setAiDialog({ open: false, key: null });
      setAiInstruction("");
      toast.success("החלק עודכן על ידי AI");
    } finally {
      setAiLoading(false);
    }
  }

  function openAiDialog(key: SectionKey) {
    if (!script) { toast.error("שמור קודם את התסריט כדי להשתמש ב-AI"); return; }
    setAiInstruction("");
    setAiDialog({ open: true, key });
  }

  async function handleSuggest(key: SectionKey) {
    // Auto-save first if script doesn't exist yet
    let scriptId = script?.id;
    if (!scriptId) {
      setSaving(true);
      try {
        const res = await fetch("/api/script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sections),
        });
        const json = await res.json() as { script: CallScript; error?: string };
        if (!res.ok) { toast.error(json.error ?? "שגיאה בשמירה"); return; }
        setScript(json.script);
        scriptId = json.script.id;
      } finally {
        setSaving(false);
      }
    }

    setSuggestLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/script/${scriptId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionKey: key, mode: "suggest" }),
      });
      const json = await res.json() as { text?: string; error?: string; quota?: boolean };
      if (!res.ok || !json.text) {
        toast.error(json.error ?? "שגיאת AI", { duration: json.quota ? 8000 : 4000 });
        return;
      }
      setSections((prev) => ({ ...prev, [key]: json.text! }));
      toast.success("הרעיון הוכנס — ניתן לערוך ולהתאים");
    } finally {
      setSuggestLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  const currentSection = aiDialog.key ? SECTIONS.find((s) => s.key === aiDialog.key) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            תסריט שיחה אישי
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.nickname ?? profile?.full_name ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {script && (() => {
            const cfg = STATUS_CONFIG[script.status];
            const Icon = cfg.icon;
            return (
              <Badge
                className={cn("gap-1.5 px-3 py-1 text-xs font-semibold border", cfg.className)}
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.label}
              </Badge>
            );
          })()}
          {isApproved && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(`/print/script/${script!.id}`, "_blank")}
              >
                <Printer className="h-4 w-4" />
                הדפסה
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleNewScript}
              >
                <PlusCircle className="h-4 w-4" />
                תסריט חדש
              </Button>
            </>
          )}
          {isEditable && (
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              שמור טיוטה
            </Button>
          )}
          {isEditable && script && (
            <Button size="sm" onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              שלח לאישור
            </Button>
          )}
        </div>
      </div>

      {/* Admin note if rejected */}
      {script?.status === "rejected" && script.admin_note && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-500 mb-1.5">
            הערת מנהל
          </p>
          <p className="text-sm text-foreground/80">{script.admin_note}</p>
        </div>
      )}

      {/* Pending / Approved note */}
      {script?.status === "pending" && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-4">
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            התסריט נשלח לאישור המנהל. לא ניתן לערוך עד לקבלת תשובה.
          </p>
        </div>
      )}
      {script?.status === "approved" && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            התסריט אושר! ניתן להדפיס ולהשתמש בו.
          </p>
        </div>
      )}

      {/* Section cards */}
      {SECTIONS.map((section, i) => (
        <div
          key={section.key}
          className="rounded-2xl border border-border bg-card p-6 space-y-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
                style={{ background: "linear-gradient(135deg, #0A7EFF 0%, #0044CC 100%)" }}
              >
                {i + 1}
              </span>
              <div>
                <p className="text-[14px] font-bold text-foreground leading-tight">{section.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{section.subtitle}</p>
              </div>
            </div>
            {isEditable && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleSuggest(section.key)}
                  disabled={!!suggestLoading[section.key]}
                  title="יצירת רעיון ראשוני אוטומטי"
                >
                  {suggestLoading[section.key]
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-500" />
                    : <Sparkles className="h-3.5 w-3.5 text-teal-500" />
                  }
                  {suggestLoading[section.key] ? "יוצר..." : "הצע ראשוני"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => openAiDialog(section.key)}
                  disabled={!!suggestLoading[section.key]}
                >
                  <Wand2 className="h-3.5 w-3.5 text-violet-500" />
                  ערוך עם AI
                </Button>
              </div>
            )}
          </div>
          {isApproved ? (
            <div
              className="min-h-[110px] rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
              dir="rtl"
            >
              {sections[section.key] || <span className="text-muted-foreground/50">(ריק)</span>}
            </div>
          ) : (
            <Textarea
              value={sections[section.key]}
              onChange={(e) => setSections((prev) => ({ ...prev, [section.key]: e.target.value }))}
              readOnly={isPending}
              placeholder={`כתוב כאן את ${section.title}...`}
              className={cn(
                "min-h-[110px] resize-y text-sm leading-relaxed",
                isPending && "opacity-70 cursor-default"
              )}
              dir="rtl"
            />
          )}
        </div>
      ))}

      {/* Bottom submit CTA for first-time save */}
      {!script && (
        <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          צור תסריט
        </Button>
      )}

      {/* AI Edit Dialog */}
      <Dialog open={aiDialog.open} onOpenChange={(v) => { if (!v) setAiDialog({ open: false, key: null }); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-violet-500" />
              עריכת AI — {currentSection?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                ספר ל-AI מה לשנות / לשפר בחלק זה:
              </p>
              <Textarea
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                placeholder="לדוגמה: תן לזה להישמע יותר חם ואישי, הוסף שאלה פתוחה..."
                className="min-h-[100px] text-sm"
                dir="rtl"
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1 gap-2"
                onClick={handleAiEdit}
                disabled={aiLoading || !aiInstruction.trim()}
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {aiLoading ? "מעבד..." : "ערוך עם AI"}
              </Button>
              <Button variant="outline" onClick={() => setAiDialog({ open: false, key: null })}>
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
