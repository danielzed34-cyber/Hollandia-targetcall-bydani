"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Check, X, Clock, RefreshCw } from "lucide-react";

interface RegRequest {
  id: string;
  username: string;
  full_name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function RegistrationsPage() {
  const [requests, setRequests] = useState<RegRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/registration-requests");
      const data = await res.json() as { requests: RegRequest[] };
      setRequests(data.requests ?? []);
    } catch {
      toast.error("שגיאה בטעינת הבקשות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  async function act(id: string, action: "approve" | "reject") {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/registration-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "שגיאה"); return; }
      toast.success(action === "approve" ? "המשתמש הוקם בהצלחה" : "הבקשה נדחתה");
      await fetchRequests();
    } catch {
      toast.error("שגיאה בביצוע הפעולה");
    } finally {
      setActing(null);
    }
  }

  const visible = filter === "pending"
    ? requests.filter((r) => r.status === "pending")
    : requests;

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">בקשות הרשמה</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount > 0 ? `${pendingCount} בקשות ממתינות לאישור` : "אין בקשות ממתינות"}
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          רענן
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["pending", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "pending" ? "ממתינות" : "הכל"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          אין בקשות להצגה
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4"
            >
              {/* Status dot */}
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  req.status === "pending"
                    ? "bg-amber-500 animate-pulse"
                    : req.status === "approved"
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`}
              />

              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">{req.full_name}</p>
                <p className="text-sm text-muted-foreground font-mono">{req.username}</p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Clock className="h-3.5 w-3.5" />
                {new Date(req.created_at).toLocaleDateString("he-IL", {
                  day: "2-digit", month: "2-digit", year: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })}
              </div>

              {req.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => act(req.id, "approve")}
                    disabled={!!acting}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    אישור
                  </button>
                  <button
                    onClick={() => act(req.id, "reject")}
                    disabled={!!acting}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    דחייה
                  </button>
                </div>
              )}

              {req.status !== "pending" && (
                <span
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold ${
                    req.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {req.status === "approved" ? "אושר" : "נדחה"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
