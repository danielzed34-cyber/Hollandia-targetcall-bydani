import { NextResponse } from "next/server";
import { BRANCH_SHEET_IDS } from "@/config/external-links";

export const runtime = "nodejs";

/** Returns { [branchName]: googleSheetsUrl } for all configured branches */
export function GET() {
  const urls: Record<string, string> = {};
  for (const [name, id] of Object.entries(BRANCH_SHEET_IDS)) {
    if (id && id !== "REPLACE_ME") {
      urls[name] = `https://docs.google.com/spreadsheets/d/${id}`;
    }
  }
  return NextResponse.json(urls);
}
