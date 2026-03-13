"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown, ChevronUp, Sparkles, Loader2, FileText,
  Upload, FileAudio, X, CheckCircle2,
} from "lucide-react";

interface FeedbackReport {
  transcript?: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  script_suggestion: string;
  score: number;
}

interface FeedbackRequest {
  id: string;
  rep_id: string;
  rep_name: string;
  customer_name: string;
  customer_phone: string;
  struggle_point: string;
  status: "pending" | "processing" | "done" | "acknowledged";
  transcript: string | null;
  report: FeedbackReport | null;
  action_improvements: string | null;
  action_preservation: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין לניתוח",
  processing: "מנתח...",
  done: "משוב מוכן",
  acknowledged: "אושר",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  done: "bg-primary/15 text-primary border-primary/30",
  acknowledged: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
};

// ── Report view ───────────────────────────────────────────────
function ReportView({ report, transcript }: { report: FeedbackReport; transcript: string | null }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const transcriptText = transcript ?? report.transcript;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">ציון:</span>
        <span className="font-bold text-primary text-base">{report.score}/10</span>
      </div>
      <div>
        <p className="text-xs font-semibold mb-1">סיכום</p>
        <p className="text-sm text-muted-foreground">{report.summary}</p>
      </div>
      {report.strengths?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">שימור — מה עשית טוב</p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
      {report.improvements?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">שיפור — מה לשפר</p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            {report.improvements.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
      {report.script_suggestion && (
        <div>
          <p className="text-xs font-semibold mb-1">הצעה לסקריפט</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded p-2">
            {report.script_suggestion}
          </p>
        </div>
      )}
      {transcriptText && (
        <div>
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileText className="h-3 w-3" />
            {showTranscript ? "הסתר תמליל" : "הצג תמליל שיחה"}
            {showTranscript ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showTranscript && (
            <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap bg-muted/20 rounded p-2 max-h-48 overflow-y-auto">
              {transcriptText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Admin: upload MP3 panel ───────────────────────────────────
function AdminUploadPanel({ reqId, onDone }: { reqId: string; onDone: () => void }) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function upload() {
    if (!audioFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("audio", audioFile);
      const res = await fetch(`/api/feedback/${reqId}/analyze`, { method: "POST", body: fd });
      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success("ניתוח הושלם! הנציג יקבל את המשוב.");
      onDone();
    } catch (err) {
      toast.error("שגיאה בניתוח", { description: err instanceof Error ? err.message : "נסה שוב" });
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-xs font-semibold">העלה קובץ שיחה לניתוח AI</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
      />
      {audioFile ? (
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-muted/30 text-sm">
          <FileAudio className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 truncate">{audioFile.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</span>
          {!uploading && (
            <button type="button" onClick={() => { setAudioFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
              <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          לחץ לבחירת קובץ MP3
        </button>
      )}
      {audioFile && (
        <Button size="sm" className="w-full gap-2" onClick={upload} disabled={uploading}>
          {uploading ? (
            <><Loader2 className="h-3 w-3 animate-spin" />מתמלל ומנתח... (עד דקה)</>
          ) : (
            <><Sparkles className="h-3 w-3" />נתח עם AI ושלח לנציג</>
          )}
        </Button>
      )}
    </div>
  );
}

// ── Rep: acknowledge + action plan panel ─────────────────────
function RepAcknowledgePanel({ reqId, onDone }: { reqId: string; onDone: () => void }) {
  const [form, setForm] = useState({ improvements: "", preservation: "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.improvements.trim() || !form.preservation.trim()) {
      toast.error("יש למלא את שני השדות");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/feedback/${reqId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionImprovements: form.improvements,
          actionPreservation: form.preservation,
        }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success("אושר! תודה על לקיחת האחריות.");
      onDone();
    } catch (err) {
      toast.error("שגיאה", { description: err instanceof Error ? err.message : "נסה שוב" });
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-sm font-semibold">לקיחת אחריות על המשוב</p>
      <p className="text-xs text-muted-foreground">קרא את המשוב ומלא מה אתה לוקח לפעולה:</p>

      <div className="space-y-1.5">
        <Label className="text-xs">מה אני לוקח לשיפור? *</Label>
        <Textarea
          placeholder="לדוגמה: אתמקד בהתמודדות עם התנגדויות מחיר..."
          rows={3}
          value={form.improvements}
          onChange={(e) => setForm((p) => ({ ...p, improvements: e.target.value }))}
          disabled={saving}
          className="resize-none text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">מה אני שומר וממשיך לעשות? *</Label>
        <Textarea
          placeholder="לדוגמה: אמשיך להתחיל את השיחה בהקשבה פעילה..."
          rows={3}
          value={form.preservation}
          onChange={(e) => setForm((p) => ({ ...p, preservation: e.target.value }))}
          disabled={saving}
          className="resize-none text-sm"
        />
      </div>

      <Button size="sm" className="w-full gap-2" onClick={submit} disabled={saving}>
        {saving ? (
          <><Loader2 className="h-3 w-3 animate-spin" />שומר...</>
        ) : (
          <><CheckCircle2 className="h-3 w-3" />אישור קריאה ולקיחת אחריות</>
        )}
      </Button>
    </div>
  );
}

// ── Request card ──────────────────────────────────────────────
function RequestCard({ req, isAdmin, onRefresh }: {
  req: FeedbackRequest;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm">{req.customer_name}</p>
          <p className="text-xs text-muted-foreground" dir="ltr">{req.customer_phone}</p>
          {isAdmin && <p className="text-xs text-muted-foreground">נציג: {req.rep_name}</p>}
          <p className="text-xs text-muted-foreground">
            {new Date(req.created_at).toLocaleDateString("he-IL")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={STATUS_COLORS[req.status]}>
            {req.status === "processing" && <Loader2 className="h-2.5 w-2.5 animate-spin me-1" />}
            {STATUS_LABELS[req.status]}
          </Badge>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3">
          {/* Notes from rep */}
          {req.struggle_point?.trim() && (
            <div>
              <p className="text-xs font-semibold mb-1">הערות הנציג:</p>
              <p className="text-sm text-muted-foreground">{req.struggle_point}</p>
            </div>
          )}

          {/* Status: waiting */}
          {(req.status === "pending" || req.status === "processing") && !isAdmin && (
            <p className="text-xs text-muted-foreground">
              {req.status === "processing" ? "המערכת מנתחת את השיחה..." : "ממתין שהמנהל יעלה את הקלטת השיחה."}
            </p>
          )}

          {/* Admin: upload MP3 */}
          {isAdmin && req.status === "pending" && (
            <AdminUploadPanel reqId={req.id} onDone={onRefresh} />
          )}
          {isAdmin && req.status === "processing" && (
            <p className="text-xs text-muted-foreground border-t border-border pt-3">המערכת מנתחת את השיחה...</p>
          )}

          {/* Report (shown when done or acknowledged) */}
          {(req.status === "done" || req.status === "acknowledged") && req.report && (
            <div className="border-t border-border pt-3">
              <ReportView report={req.report} transcript={req.transcript} />
            </div>
          )}

          {/* Rep: must acknowledge + action plan when status is "done" */}
          {!isAdmin && req.status === "done" && (
            <RepAcknowledgePanel reqId={req.id} onDone={onRefresh} />
          )}

          {/* Show rep's submitted action plan (acknowledged) */}
          {req.status === "acknowledged" && req.action_improvements && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                אושר ב-{req.acknowledged_at ? new Date(req.acknowledged_at).toLocaleDateString("he-IL") : ""}
              </p>
              <div>
                <p className="text-xs font-semibold mb-0.5">לוקח לשיפור:</p>
                <p className="text-sm text-muted-foreground">{req.action_improvements}</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-0.5">שומר וממשיך:</p>
                <p className="text-sm text-muted-foreground">{req.action_preservation}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main list ─────────────────────────────────────────────────
export function FeedbackList() {
  const { role } = useAuth();
  const isAdmin = role === "Admin";
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    const res = await fetch("/api/feedback");
    if (res.ok) {
      const data = await res.json() as { requests: FeedbackRequest[] };
      setRequests(data.requests);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
    const supabase = createClient();
    const channel = supabase
      .channel("feedback_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback_requests" }, () => {
        loadRequests();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadRequests]);

  if (loading) return <p className="text-sm text-muted-foreground">טוען...</p>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isAdmin ? "כל בקשות המשוב" : "הבקשות שלי"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין בקשות משוב עדיין.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                isAdmin={isAdmin}
                onRefresh={loadRequests}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
