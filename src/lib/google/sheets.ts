/**
 * Google Sheets API service — server-side only.
 *
 * IMPORTANT: Tab names containing Hebrew, spaces, or special chars (+, /, -)
 * MUST be wrapped in single quotes in the range string, e.g. `'תלונות שירות'!A1`.
 * The `quoteTab` helper below applies this automatically to every call.
 *
 * Column layout (as of current Sheets structure):
 *
 * Branch sheets  (A–I):
 *   A: Timestamp (DD/MM/YYYY HH:mm:ss, Israel time)
 *   B: Customer Name   C: Phone   D: Meeting Date (DD/MM/YYYY)
 *   E: Meeting Time    F: Branch  G: Customer ID   H: ""   I: ""
 *
 * Master LOG sheet (A–J):
 *   A–I: identical to branch sheets
 *   J: Rep Name
 *
 * Complaints sheet (A–J):
 *   A: Timestamp  B: Rep Name  C: Customer Name  D: Phone
 *   E: Delivery ID  F: Branch  G: Complaint Details  H: Internal Notes
 *   I: ""  J: Status
 */

import { google } from "googleapis";
import { getGoogleAuthClient } from "./auth";
import {
  MASTER_LOG_SHEET_ID,
  MASTER_LOG_TAB,
  COMPLAINTS_SHEET_ID,
  COMPLAINTS_TAB,
  BRANCH_SHEET_IDS,
  BRANCH_TAB_NAMES,
} from "@/config/external-links";

// ─── Types ────────────────────────────────────────────────────

export interface AppointmentRow {
  repName: string;
  customerName: string;
  phone: string;
  idNumber: string;      // Hollandia customer ID / ת.ז
  branch: string;
  meetingDate: string;   // YYYY-MM-DD from HTML date input
  meetingTime: string;   // HH:MM from HTML time input
  notes: string;
}

export interface ComplaintRow {
  repName: string;
  customerName: string;
  phone: string;
  deliveryId: string;
  branch: string;
  complaintDetails: string;
  internalNotes: string;
}

// ─── Tab-name quoting ─────────────────────────────────────────

/**
 * Wraps a tab name in single quotes for the Sheets API range string.
 * Escapes any literal single-quotes inside the name by doubling them.
 */
function quoteTab(tabName: string): string {
  return `'${tabName.replace(/'/g, "''")}'`;
}

// ─── Date / time formatting (Israel timezone) ─────────────────

/**
 * Returns the current Israel-time timestamp formatted as "DD/MM/YYYY HH:mm:ss".
 * Always uses Asia/Jerusalem regardless of server timezone.
 */
function nowIsraelTimestamp(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/**
 * Converts an HTML date input value (YYYY-MM-DD) to DD/MM/YYYY for Sheets.
 * Returns the value unchanged if it is not in YYYY-MM-DD format.
 */
function toSheetDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// ─── Core append helper ───────────────────────────────────────

export async function appendRows(
  spreadsheetId: string,
  rows: (string | number)[][],
  tabName: string
): Promise<void> {
  const auth = await getGoogleAuthClient();
  const sheets = google.sheets({ version: "v4", auth: auth as never });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${quoteTab(tabName)}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

// ─── Master LOG ───────────────────────────────────────────────
// Columns A–J:
//   A: Timestamp  B: Customer Name  C: Phone  D: Meeting Date
//   E: Meeting Time  F: Branch  G: Customer ID  H: ""  I: ""  J: Rep Name

export async function appendToMasterLog(data: AppointmentRow): Promise<void> {
  const timestamp   = nowIsraelTimestamp();
  const meetingDate = toSheetDate(data.meetingDate);

  const logRowData = [
    timestamp,         // A
    data.customerName, // B
    data.phone,        // C
    meetingDate,       // D
    data.meetingTime,  // E
    data.branch,       // F
    data.idNumber,     // G
    "",                // H
    "",                // I
    data.repName,      // J
  ];

  await appendRows(MASTER_LOG_SHEET_ID, [logRowData], MASTER_LOG_TAB);
}

// ─── Branch Sheet ─────────────────────────────────────────────
// Columns A–I:
//   A: Timestamp  B: Customer Name  C: Phone  D: Meeting Date
//   E: Meeting Time  F: Branch  G: Customer ID  H: ""  I: ""

export async function appendToBranchSheet(
  branchName: string,
  data: AppointmentRow
): Promise<void> {
  const sheetId = BRANCH_SHEET_IDS[branchName];
  if (!sheetId || sheetId === "REPLACE_ME") {
    throw new Error(
      `No Google Sheet ID configured for branch "${branchName}". ` +
      `Add it to BRANCH_SHEET_IDS in config/external-links.ts.`
    );
  }

  const tabName = BRANCH_TAB_NAMES[branchName];
  if (!tabName) {
    throw new Error(
      `No tab name configured for branch "${branchName}". ` +
      `Add it to BRANCH_TAB_NAMES in config/external-links.ts.`
    );
  }

  const timestamp   = nowIsraelTimestamp();
  const meetingDate = toSheetDate(data.meetingDate);

  const branchRowData = [
    timestamp,         // A
    data.customerName, // B
    data.phone,        // C
    meetingDate,       // D
    data.meetingTime,  // E
    data.branch,       // F
    data.idNumber,     // G
    "",                // H
    "",                // I
  ];

  await appendRows(sheetId, [branchRowData], tabName);
}

// ─── Complaints Sheet ─────────────────────────────────────────

export async function appendToComplaintsSheet(
  data: ComplaintRow
): Promise<void> {
  const timestamp = nowIsraelTimestamp();

  const row = [
    timestamp,            // A
    data.repName,         // B
    data.customerName,    // C
    data.phone,           // D
    data.deliveryId,      // E
    data.branch,          // F
    data.complaintDetails,// G
    data.internalNotes,   // H
    "",                   // I
    "פתוח",              // J – default status
  ];

  await appendRows(COMPLAINTS_SHEET_ID, [row], COMPLAINTS_TAB);
}

// ─── Read rows ────────────────────────────────────────────────

/**
 * Reads rows from a sheet range.
 * range: e.g. "'Log'!A2:J" or "A2:B" (no tab = first sheet)
 */
export async function readRows(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const auth = await getGoogleAuthClient();
  const sheets = google.sheets({ version: "v4", auth: auth as never });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (res.data.values as string[][] | null | undefined) ?? [];
}

// ─── Convenience ──────────────────────────────────────────────

export async function appendAppointment(data: AppointmentRow): Promise<void> {
  await Promise.all([
    appendToMasterLog(data),
    appendToBranchSheet(data.branch, data),
  ]);
}
