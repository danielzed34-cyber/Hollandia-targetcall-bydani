"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useProductivityStore } from "@/stores/productivity-store";
import { Clock, TrendingUp, CalendarCheck, AlertCircle } from "lucide-react";

function elapsedStr(from: string | null): string {
  if (!from) return "--:--:--";
  const diff = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ProductivityWidget() {
  const { appointmentsToday, complaintsToday, setSessionStart, checkAndReset } =
    useProductivityStore();

  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchClockIn = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/clock");
      if (!res.ok) return;
      const data = await res.json() as { status: string; lastEvent: string | null };
      if (data.status === "clocked_in" && data.lastEvent) {
        setClockInTime(data.lastEvent);
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    setSessionStart();
    checkAndReset();
    void fetchClockIn();

    intervalRef.current = setInterval(() => {
      setTick((t) => t + 1);
      checkAndReset();
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setSessionStart, checkAndReset, fetchClockIn]);

  const shiftTime = elapsedStr(clockInTime);
  const elapsedMs = clockInTime ? Date.now() - new Date(clockInTime).getTime() : 0;
  const elapsedHours = elapsedMs / 3_600_000;
  const hourlyRate =
    elapsedHours > 0.01
      ? (appointmentsToday / elapsedHours).toFixed(1)
      : "—";

  void tick;

  return (
    <div
      className="px-3 py-4 shrink-0"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <p
        className="mb-2.5 px-1 text-[9px] font-bold uppercase tracking-[0.15em]"
        style={{ color: "#ffffff" }}
      >
        פרודוקטיביות
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {/* Session Time */}
        <div
          className="flex flex-col gap-1 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 shrink-0" style={{ color: "#3B6EA8" }} />
            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#ffffff" }}>
              זמן
            </p>
          </div>
          <p className="font-mono text-xs font-bold tabular-nums text-white/80">
            {shiftTime}
          </p>
        </div>

        {/* Appointments Today */}
        <div
          className="flex flex-col gap-1 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-1.5">
            <CalendarCheck className="h-3 w-3 shrink-0" style={{ color: "#3B6EA8" }} />
            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#ffffff" }}>
              פגישות
            </p>
          </div>
          <p className="text-xs font-bold text-white/80">{appointmentsToday}</p>
        </div>

        {/* Complaints Today */}
        <div
          className="flex flex-col gap-1 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 shrink-0" style={{ color: "#3B6EA8" }} />
            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#ffffff" }}>
              קריאות
            </p>
          </div>
          <p className="text-xs font-bold text-white/80">{complaintsToday}</p>
        </div>

        {/* Hourly Rate */}
        <div
          className="flex flex-col gap-1 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 shrink-0" style={{ color: "#3B6EA8" }} />
            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#ffffff" }}>
              קצב
            </p>
          </div>
          <p className="text-xs font-bold text-white/80">
            {hourlyRate}
            {hourlyRate !== "—" && (
              <span className="text-[9px] font-medium ms-0.5" style={{ color: "#ffffff" }}>
                /ש׳
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
