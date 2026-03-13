"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, Clock, FileText, Printer,
  ChevronDown, ChevronUp, Loader2
} from "lucide-react";
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
  { key: "section_1" as const, title: "פתיחת השיחה" },
  { key: "section_2" as const, title: "התחברות רגשית" },
  { key: "section_3" as const, title: "הצגת הערך והחשיבות" },
  { key: "section_4" as const, title: "הצגת ההטבה" },
  { key: "section_5" as const, title: "קביעת פגישה" },
  { key: "section_6" as const, title: "סיכום השיחה" },
];

const STATUS_CONFIG: Record<ScriptStatus, { label: string; icon: React.ElementType; className: string }> = {
  draft:    { label: "טיוטה",       icon: FileText,    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  pending:  { label: "ממתין לאישור", icon: Clock,       className: "bg-amber-500/15 text-amber-500 border-amber-500/20" },
  approved: { label: "מאושר",       icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20" },
  rejected: { label: "נדחה",        icon: XCircle,      className: "bg-rose-500/15 text-rose-500 border-rose-500/20" },
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "pending",  label: "ממתינים לאישור" },
  { value: "all",      label: "הכל" },
  { value: "approved", label: "מאושרים" },
  { value: "rejected", label: "נדחו" },
];

export function ScriptsReview() {
  const [scripts, setScripts] = useState<CallScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    script: CallScript | null;
    action: "approve" | "reject" | null;
  }>({ open: false, script: null, action: null });
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    try {
      const url = activeTab === "all" ? "/api/admin/scripts" : `/api/admin/scripts?status=${activeTab}`;
      const res = await fetch(url);
      const json = await res.json() as { scripts: CallScript[] };
      setScripts(json.scripts ?? []);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { void fetchScripts(); }, [fetchScripts]);

  function openAction(script: CallScript, action: "approve" | "reject") {
    setAdminNote("");
    setActionDialog({ open: true, script, action });
  }

  async function handleAction() {
    if (!actionDialog.script || !actionDialog.action) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/scripts/${actionDialog.script.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionDialog.action, admin_note: adminNote }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { toast.error(json.error ?? "שגיאה"); return; }
      toast.success(actionDialog.action === "approve" ? "התסריט אושר" : "התסריט נדחה");
      setActionDialog({ open: false, script: null, action: null });
      void fetchScripts();
    } finally {
      setActionLoading(false);
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" });

  return (
    <div className="space-y-6">

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "px-4 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150",
              activeTab === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : scripts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground text-sm">
          אין תסריטים
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map((s) => {
            const cfg = STATUS_CONFIG[s.status];
            const Icon = cfg.icon;
            const isExpanded = expandedId === s.id;

            return (
              <div key={s.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-foreground truncate">{s.rep_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(s.updated_at)}</p>
                  </div>
                  <Badge className={cn("gap-1.5 px-3 py-1 text-xs font-semibold border shrink-0", cfg.className)}>
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </Badge>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-emerald-600 hover:text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                          onClick={(e) => { e.stopPropagation(); openAction(s, "approve"); }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          אשר
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-rose-600 hover:text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                          onClick={(e) => { e.stopPropagation(); openAction(s, "reject"); }}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          דחה
                        </Button>
                      </>
                    )}
                    {s.status === "approved" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5"
                        onClick={(e) => { e.stopPropagation(); window.open(`/print/script/${s.id}`, "_blank"); }}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        הדפס
                      </Button>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded sections */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-4">
                    {s.admin_note && (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-500 mb-1">הערת מנהל</p>
                        <p className="text-sm text-foreground/80">{s.admin_note}</p>
                      </div>
                    )}
                    {SECTIONS.map((sec, i) => (
                      <div key={sec.key} className="space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                          {i + 1}. {sec.title}
                        </p>
                        <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed min-h-[60px]">
                          {s[sec.key] || <span className="text-muted-foreground italic">ריק</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(v) => { if (!v) setActionDialog({ open: false, script: null, action: null }); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.action === "approve"
                ? <><CheckCircle2 className="h-5 w-5 text-emerald-500" /> אישור תסריט</>
                : <><XCircle className="h-5 w-5 text-rose-500" /> דחיית תסריט</>
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {actionDialog.script && (
              <p className="text-sm text-muted-foreground">
                נציג: <span className="font-semibold text-foreground">{actionDialog.script.rep_name}</span>
              </p>
            )}
            <div>
              <p className="text-sm font-medium mb-2">
                {actionDialog.action === "reject" ? "הערה לנציג (חובה):" : "הערה (אופציונלי):"}
              </p>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={
                  actionDialog.action === "reject"
                    ? "ציין מה יש לשפר..."
                    : "תגובה חיובית אופציונלית..."
                }
                className="min-h-[90px] text-sm"
                dir="rtl"
              />
            </div>
            <div className="flex gap-3">
              <Button
                className={cn("flex-1 gap-2", actionDialog.action === "reject" && "bg-rose-600 hover:bg-rose-700")}
                onClick={handleAction}
                disabled={
                  actionLoading ||
                  (actionDialog.action === "reject" && !adminNote.trim())
                }
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {actionDialog.action === "approve" ? "אשר תסריט" : "דחה תסריט"}
              </Button>
              <Button variant="outline" onClick={() => setActionDialog({ open: false, script: null, action: null })}>
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
