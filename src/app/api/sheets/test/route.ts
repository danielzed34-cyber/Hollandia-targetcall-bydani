/**
 * GET /api/sheets/test
 *
 * Verifies the Google Sheets service account connection by writing a
 * test row to the Master Log sheet and immediately returning the result.
 *
 * REMOVE or PROTECT this route before going to production.
 */

import { NextResponse } from "next/server";
import { appendToMasterLog } from "@/lib/google/sheets";

export const runtime = "nodejs"; // needs fs for service-account.json

export async function GET() {
  try {
    await appendToMasterLog({
      repName: "בדיקת מערכת",
      customerName: "לקוח בדיקה",
      phone: "050-0000000",
      idNumber: "000000000",
      branch: "באר שבע design+",
      meetingDate: new Date().toLocaleDateString("he-IL"),
      meetingTime: "12:00",
      notes: "שורת בדיקה – ניתן למחוק",
    });

    return NextResponse.json({
      success: true,
      message: "שורת בדיקה נוספה בהצלחה ל-Master Log",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sheets/test]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
