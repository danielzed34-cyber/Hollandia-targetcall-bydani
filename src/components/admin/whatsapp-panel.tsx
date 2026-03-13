"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wifi, WifiOff, Send, RefreshCw } from "lucide-react";

interface StatusResponse {
  connected: boolean;
  qr: string | null;
  offline?: boolean;
}

export function WhatsAppPanel() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("הודעת בדיקה ממערכת הולנדיה");
  const [sending, setSending] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json() as StatusResponse;
        setStatus(data);
      }
    } catch {
      setStatus({ connected: false, qr: null, offline: true });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Poll every 3 seconds while not connected
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function sendTest() {
    if (!testPhone.trim()) {
      toast.error("הכנס מספר טלפון");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testPhone, message: testMessage }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success("הודעת הבדיקה נשלחה!");
    } catch (err) {
      toast.error("שגיאה בשליחה", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">סטטוס חיבור WhatsApp</CardTitle>
              <CardDescription>
                סרוק את קוד ה-QR עם הטלפון המחובר ל-WhatsApp Business כדי להתחבר
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchStatus} disabled={loadingStatus}>
              <RefreshCw className={`h-4 w-4 ${loadingStatus ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingStatus && !status ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              בודק סטטוס...
            </div>
          ) : status?.offline ? (
            <div className="space-y-2">
              <Badge className="bg-destructive/15 text-destructive border-destructive/30">
                <WifiOff className="h-3 w-3 me-1" />
                שירות WhatsApp לא פועל
              </Badge>
              <p className="text-xs text-muted-foreground">
                הפעל את שירות ה-WhatsApp עם: <code className="bg-muted px-1 rounded">npm run dev:wa</code>
              </p>
            </div>
          ) : status?.connected ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
                <Wifi className="h-3 w-3 me-1" />
                מחובר
              </Badge>
              <span className="text-xs text-muted-foreground">WhatsApp מוכן לשליחת הודעות</span>
            </div>
          ) : status?.qr ? (
            <div className="space-y-3">
              <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                <Loader2 className="h-3 w-3 animate-spin me-1" />
                ממתין לסריקה
              </Badge>
              <p className="text-sm text-muted-foreground">
                פתח WhatsApp בטלפון ← הגדרות ← מכשירים מקושרים ← קשר מכשיר ← סרוק את הקוד:
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={status.qr}
                alt="WhatsApp QR Code"
                className="w-48 h-48 rounded-lg border border-border"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              מאתחל חיבור...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test send */}
      {status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">שלח הודעת בדיקה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wa-phone">מספר טלפון</Label>
              <Input
                id="wa-phone"
                type="tel"
                dir="ltr"
                placeholder="050-0000000"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                disabled={sending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-message">תוכן ההודעה</Label>
              <Textarea
                id="wa-message"
                rows={3}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                disabled={sending}
                className="resize-none"
              />
            </div>
            <Button onClick={sendTest} disabled={sending} className="gap-2">
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />שולח...</>
              ) : (
                <><Send className="h-4 w-4" />שלח הודעת בדיקה</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
