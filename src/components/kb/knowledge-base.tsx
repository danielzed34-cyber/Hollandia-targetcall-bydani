"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Search, Plus, Pencil, Trash2, X, BookOpen,
  ChevronDown, ChevronUp, Sparkles, Loader2,
  CheckCircle2, XCircle, Clock, Image as ImageIcon,
} from "lucide-react";

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  status: "draft" | "pending_approval" | "approved" | "rejected";
  image_url: string | null;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["כללי", "מכירות", "מוצרים", "שירות לקוחות", "הליכי עבודה", "תשובות לשאלות"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending_approval: { label: "ממתין לאישור", color: "bg-amber-500/15 text-amber-600 border-amber-500/20", icon: Clock },
  approved:         { label: "מאושר",        color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  rejected:         { label: "נדחה",         color: "bg-rose-500/15 text-rose-600 border-rose-500/20", icon: XCircle },
  draft:            { label: "טיוטה",        color: "bg-zinc-500/15 text-zinc-600 border-zinc-500/20", icon: Pencil },
};

function ArticleCard({ article, isAdmin, onEdit, onDelete, onApprove, onReject }: {
  article: Article; isAdmin: boolean;
  onEdit: (a: Article) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[article.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Article image */}
      {article.image_url && (
        <div className="relative w-full h-48 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-48 object-cover"
          />
          {article.ai_generated && (
            <Badge className="absolute top-2 start-2 bg-violet-500/90 text-white text-[10px] gap-1">
              <Sparkles className="h-3 w-3" />
              AI
            </Badge>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{article.category}</Badge>
              {article.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
              ))}
              {isAdmin && (
                <Badge variant="outline" className={`text-[10px] gap-1 ${statusCfg.color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {statusCfg.label}
                </Badge>
              )}
              {!article.image_url && article.ai_generated && (
                <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/20 text-[10px] gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI
                </Badge>
              )}
            </div>
            <h3 className="font-semibold mt-1.5 text-sm">{article.title}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && article.status === "pending_approval" && (
              <>
                <button
                  type="button"
                  onClick={() => onApprove(article.id)}
                  title="אשר"
                  className="p-1.5 rounded text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onReject(article.id)}
                  title="דחה"
                  className="p-1.5 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </>
            )}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(article)}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(article.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        {expanded && (
          <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-3">
            {article.content}
          </div>
        )}
      </div>
    </div>
  );
}

interface ArticleFormProps {
  initial?: Article | null;
  onSave: () => void;
  onCancel: () => void;
}

function ArticleForm({ initial, onSave, onCancel }: ArticleFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [tagsRaw, setTagsRaw] = useState(initial?.tags.join(", ") ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      toast.error("כותרת ותוכן הם שדות חובה");
      return;
    }
    setSaving(true);
    const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      const url = initial ? `/api/kb/${initial.id}` : "/api/kb";
      const method = initial ? "PATCH" : "POST";
      const body: Record<string, unknown> = { title, content, category, tags };
      // When editing a pending article, keep its status; new manual articles are approved immediately
      if (!initial) body.status = "approved";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      toast.success(initial ? "המאמר עודכן" : "המאמר נוסף");
      onSave();
    } catch (err) {
      toast.error("שגיאה בשמירה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          {initial ? "עריכת מאמר" : "מאמר חדש"}
          <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">כותרת *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="כותרת המאמר" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">קטגוריה *</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">תגיות (מופרדות בפסיק)</Label>
          <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="מכירות, שכנוע, מחיר" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">תוכן *</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="כתוב את תוכן המאמר כאן..."
            rows={6}
            className="resize-none"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "שומר..." : "שמור"}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>ביטול</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function KnowledgeBase() {
  const { role } = useAuth();
  const isAdmin = role === "Admin";
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Article | null | "new">(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (catFilter) params.set("category", catFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/kb?${params}`);
    if (res.ok) {
      const data = await res.json() as { articles: Article[] };
      setArticles(data.articles);
    }
    setLoading(false);
  }, [search, catFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("למחוק את המאמר?")) return;
    const res = await fetch(`/api/kb/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("המאמר נמחק");
      load();
    }
  }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/kb/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (res.ok) {
      toast.success("המאמר אושר ופורסם");
      load();
    }
  }

  async function handleReject(id: string) {
    const res = await fetch(`/api/kb/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) {
      toast.success("המאמר נדחה");
      load();
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/kb/generate", { method: "POST" });
      const data = await res.json() as { success?: boolean; title?: string; error?: string; imageGenerated?: boolean };
      if (!res.ok) throw new Error(data.error ?? "שגיאה ביצירת מאמר");
      toast.success("מאמר חדש נוצר!", {
        description: `${data.title}${data.imageGenerated ? " (כולל תמונה)" : ""}`,
      });
      // Switch to pending filter so admin sees the new article
      setStatusFilter("pending_approval");
      load();
    } catch (err) {
      toast.error("שגיאה ביצירת מאמר", {
        description: err instanceof Error ? err.message : "נסה שוב",
      });
    } finally {
      setGenerating(false);
    }
  }

  const pendingCount = isAdmin
    ? articles.filter((a) => a.status === "pending_approval").length
    : 0;

  return (
    <div className="space-y-4">
      {/* Admin: pending approval banner */}
      {isAdmin && pendingCount > 0 && !statusFilter && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm flex-1">
            <span className="font-semibold">{pendingCount}</span> מאמרים ממתינים לאישור
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setStatusFilter("pending_approval")}
          >
            צפה במאמרים
          </Button>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="חיפוש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="flex h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs min-w-36"
        >
          <option value="">כל הקטגוריות</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {isAdmin && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs min-w-32"
          >
            <option value="">כל הסטטוסים</option>
            <option value="pending_approval">ממתין לאישור</option>
            <option value="approved">מאושר</option>
            <option value="rejected">נדחה</option>
            <option value="draft">טיוטה</option>
          </select>
        )}

        {isAdmin && editing === null && (
          <>
            <Button size="sm" className="gap-2" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" />
              מאמר חדש
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "יוצר מאמר..." : "צור מאמר AI"}
            </Button>
          </>
        )}
      </div>

      {/* Article form */}
      {editing !== null && (
        <ArticleForm
          initial={editing === "new" ? null : editing}
          onSave={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Articles */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">טוען...</p>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          {statusFilter === "pending_approval" ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
              <p className="text-sm text-muted-foreground">אין מאמרים ממתינים לאישור</p>
              <Button size="sm" variant="ghost" onClick={() => setStatusFilter("")} className="text-xs mt-1">
                הצג את כל המאמרים
              </Button>
            </>
          ) : (
            <>
              <BookOpen className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">לא נמצאו מאמרים</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <ArticleCard
              key={a.id}
              article={a}
              isAdmin={isAdmin}
              onEdit={(art) => setEditing(art)}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
