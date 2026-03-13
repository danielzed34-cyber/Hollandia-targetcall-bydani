/**
 * Productivity store — persisted in localStorage.
 *
 * Rules:
 *  - Appointment counter resets every day at 07:00 AM (Israel time).
 *  - Session timer starts fresh each time the component mounts (per browser session).
 *  - The store persists the counter and last-reset timestamp so the daily
 *    count survives page refreshes during the same working day.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DAILY_RESET_HOUR } from "@/config/external-links";

interface ProductivityState {
  /** Appointments booked today (resets at DAILY_RESET_HOUR) */
  appointmentsToday: number;
  /** Service complaints logged today (resets at DAILY_RESET_HOUR) */
  complaintsToday: number;
  /** ISO timestamp of the last time the counter was reset */
  lastResetAt: string | null;
  /** When the current browser session started (not persisted) */
  sessionStart: number | null;

  // Actions
  incrementAppointments: () => void;
  incrementComplaints: () => void;
  checkAndReset: () => void;
  setSessionStart: () => void;
}

/** Returns today's reset threshold as a Date (today at 07:00 AM Israel time) */
function getTodayResetTime(): Date {
  const now = new Date();
  const israelNow = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const getPart = (type: string) =>
    israelNow.find((p) => p.type === type)?.value ?? "0";

  const year = parseInt(getPart("year"));
  const month = parseInt(getPart("month")) - 1;
  const day = parseInt(getPart("day"));

  // Build the reset time for "today at DAILY_RESET_HOUR in Israel"
  const reset = new Date(
    Date.UTC(year, month, day, DAILY_RESET_HOUR - 3) // Israel is UTC+3 (standard)
  );
  return reset;
}

export const useProductivityStore = create<ProductivityState>()(
  persist(
    (set, get) => ({
      appointmentsToday: 0,
      complaintsToday: 0,
      lastResetAt: null,
      sessionStart: null,

      checkAndReset() {
        const now = new Date();
        const resetTime = getTodayResetTime();
        const { lastResetAt } = get();

        const shouldReset =
          now >= resetTime &&
          (lastResetAt === null || new Date(lastResetAt) < resetTime);

        if (shouldReset) {
          set({ appointmentsToday: 0, complaintsToday: 0, lastResetAt: now.toISOString() });
        }
      },

      incrementAppointments() {
        get().checkAndReset();
        set((s) => ({ appointmentsToday: s.appointmentsToday + 1 }));
      },

      incrementComplaints() {
        get().checkAndReset();
        set((s) => ({ complaintsToday: s.complaintsToday + 1 }));
      },

      setSessionStart() {
        set({ sessionStart: Date.now() });
      },
    }),
    {
      name: "hollandia-productivity",
      // Only persist counter data, NOT session start time
      partialize: (s) => ({
        appointmentsToday: s.appointmentsToday,
        complaintsToday: s.complaintsToday,
        lastResetAt: s.lastResetAt,
      }),
    }
  )
);
