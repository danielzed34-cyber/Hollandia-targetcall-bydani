/**
 * GET /api/reminders
 *
 * Returns upcoming appointments that need WhatsApp reminders,
 * read directly from the reminders sheet (tab "נתונים").
 *
 * Target dates:
 *   - Default:   today + tomorrow
 *   - Thursday:  today + tomorrow (Friday) + next Sunday
 *
 * Sheet columns (A–G):
 *   A(0): Customer Name   B(1): Phone      C(2): Meeting Date (DD/MM/YYYY)
 *   D(3): Rep Name        E(4): (unused)   F(5): Branch   G(6): Meeting Time
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readRows } from "@/lib/google/sheets";
import { REMINDERS_SHEET_ID, REMINDERS_SHEET_TAB, BRANCH_MAP } from "@/config/external-links";

export const runtime = "nodejs";

export interface ReminderAppointment {
  customerName: string;
  phone: string;
  branch: string;
  address: string;
  meetingDate: string; // DD/MM/YYYY
  meetingTime: string;
  repName: string;
}

/** Returns current date components in Israel timezone */
function getIsraelToday(): { day: number; month: number; year: number; dayOfWeek: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  const year = get("year"); const month = get("month"); const day = get("day");
  const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0=Sun … 6=Sat
  return { day, month, year, dayOfWeek };
}

function toDD(year: number, month: number, day: number): string {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/**
 * Normalizes a date string to DD/MM/YYYY.
 * Handles D/M/YYYY or DD/M/YYYY variants that Google Sheets may return.
 */
function normalizeSheetDate(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return raw.trim();
  return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
}

/** Returns the target dates (DD/MM/YYYY) for reminders */
function getTargetDates(): string[] {
  const { day, month, year, dayOfWeek } = getIsraelToday();
  const today = new Date(year, month - 1, day);
  const todayStr = toDD(year, month, day);

  if (dayOfWeek === 4) {
    // Thursday → today + tomorrow (Friday) + next Sunday
    const friday = new Date(today);
    friday.setDate(today.getDate() + 1);
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + 3);
    return [
      todayStr,
      toDD(friday.getFullYear(), friday.getMonth() + 1, friday.getDate()),
      toDD(sunday.getFullYear(), sunday.getMonth() + 1, sunday.getDate()),
    ];
  } else {
    // Default → today + tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return [todayStr, toDD(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate())];
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetDates = getTargetDates();

  try {
    const range = `'${REMINDERS_SHEET_TAB}'!A2:G`;
    const rows = await readRows(REMINDERS_SHEET_ID, range);

    // Filter rows where meeting date (col C, index 2) matches a target date
    const upcoming = rows.filter((row) => {
      const meetingDate = normalizeSheetDate(row[2] ?? "");
      return targetDates.includes(meetingDate);
    });

    const seen = new Set<string>(); // deduplicate by name+date+branch
    const reminders: ReminderAppointment[] = [];

    for (const row of upcoming) {
      const customerName = row[0]?.trim() ?? "";
      const phone        = row[1]?.trim() ?? "";
      const meetingDate  = normalizeSheetDate(row[2] ?? "");
      const repName      = row[3]?.trim() ?? "";
      // row[4] unused
      const branch       = row[5]?.trim() ?? "";
      const meetingTime  = row[6]?.trim() ?? "";

      if (!customerName || !meetingDate) continue;

      const key = `${customerName}|${meetingDate}|${branch}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const branchInfo = BRANCH_MAP[branch];
      const address = branchInfo?.address ?? branch;

      reminders.push({ customerName, phone, branch, address, meetingDate, meetingTime, repName });
    }

    // Sort: target date order first, then by time
    reminders.sort((a, b) => {
      const dateOrder = targetDates.indexOf(a.meetingDate) - targetDates.indexOf(b.meetingDate);
      if (dateOrder !== 0) return dateOrder;
      return a.meetingTime.localeCompare(b.meetingTime);
    });

    return NextResponse.json({ reminders, targetDates });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[reminders]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
