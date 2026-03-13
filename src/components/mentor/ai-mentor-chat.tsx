"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, RotateCcw, User } from "lucide-react";

interface Message {
  role: "user" | "model";
  text: string;
}

const QUICK_PROMPTS = [
  "הלקוח אומר שזה יקר מדי – מה לענות?",
  "הלקוח לא בטוח אם לקנות עכשיו – איך לשכנע?",
  "הלקוח מבקש הנחה – איך להתמודד?",
  "תן לי פתיחה לשיחת טלפון קרה",
  "הלקוח השווה למתחרה – מה לומר?",
];

export function AIMentorChat() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", text: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      if (!res.ok) throw new Error(data.error);
      setMessages([...next, { role: "model", text: data.reply! }]);
    } catch (err) {
      toast.error("שגיאה בחיבור למנטור", { description: err instanceof Error ? err.message : "נסה שוב" });
      // Remove the user message that failed
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4 h-[calc(100vh-10rem)]">
      {/* Quick prompts sidebar */}
      <div className="lg:col-span-1 flex flex-col gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          שאלות מהירות
        </p>
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={loading}
            onClick={() => sendMessage(p)}
            className="text-start text-xs rounded-lg border border-border px-3 py-2.5 hover:bg-muted/50 hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {p}
          </button>
        ))}
        {messages.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 gap-2 text-muted-foreground"
            onClick={() => setMessages([])}
          >
            <RotateCcw className="h-3 w-3" />
            נקה שיחה
          </Button>
        )}
      </div>

      {/* Chat area */}
      <Card className="lg:col-span-3 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-primary" />
            מנטור AI
            <Badge variant="secondary" className="text-xs ms-auto">Gemini</Badge>
          </CardTitle>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center py-10">
              <Bot className="h-12 w-12 text-primary/30" />
              <p className="text-sm text-muted-foreground">
                שלום {(profile?.nickname ?? profile?.full_name)?.split(" ")[0] ?? "נציג"}!<br />
                אני כאן לעזור עם טכניקות מכירה, התמודדות עם התנגדויות, וסקריפטים.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {msg.role === "user"
                  ? <User className="h-4 w-4" />
                  : <Bot className="h-4 w-4 text-primary" />
                }
              </div>
              <div className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-te-sm"
                  : "bg-muted text-foreground rounded-ts-sm"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-2xl rounded-ts-sm bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </CardContent>

        {/* Input */}
        <div className="shrink-0 border-t border-border p-4">
          <div className="flex gap-2 items-end">
            <Textarea
              placeholder="שאל את המנטור... (Enter לשליחה, Shift+Enter לשורה חדשה)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={loading}
              className="resize-none flex-1"
            />
            <Button
              size="icon"
              className="h-[68px] w-10 shrink-0"
              disabled={!input.trim() || loading}
              onClick={() => sendMessage(input)}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
