"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";

interface Broadcast {
  id: string;
  message: string;
  created_at: string;
}

export function BroadcastModal() {
  const [queue, setQueue] = useState<Broadcast[]>([]);
  const [current, setCurrent] = useState<Broadcast | null>(null);

  useEffect(() => {
    fetch("/api/broadcasts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { broadcasts: Broadcast[] } | null) => {
        if (d?.broadcasts?.length) {
          setQueue(d.broadcasts);
          setCurrent(d.broadcasts[0]);
        }
      })
      .catch(() => {});
  }, []);

  async function dismiss() {
    if (!current) return;
    await fetch(`/api/broadcasts/${current.id}/read`, { method: "POST" }).catch(() => {});
    const remaining = queue.filter((b) => b.id !== current.id);
    setQueue(remaining);
    setCurrent(remaining[0] ?? null);
  }

  if (!current) return null;

  const remaining = queue.length;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            הודעה מהמנהל
            {remaining > 1 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({remaining} הודעות)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{current.message}</p>
          <p className="text-[11px] text-muted-foreground mt-3">
            {new Date(current.created_at).toLocaleTimeString("he-IL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <DialogFooter>
          <Button onClick={dismiss} className="w-full">
            {remaining > 1 ? `הבנתי (${remaining - 1} נותרו)` : "הבנתי"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
