/**
 * POST /api/appointments
 *
 * Receives appointment data from the CRM form, writes it to:
 *   1. The Master Log Google Sheet
 *   2. The branch-specific Google Sheet
 * Also increments daily_appointment_counts in Supabase for goal tracking.
 * Then fires a non-blocking WhatsApp confirmation to the customer.
 */

import { NextRequest, NextResponse } from "next/server";
import { appendAppointment, type AppointmentRow } from "@/lib/google/sheets";
import { BRANCH_SHEET_IDS } from "@/config/external-links";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<AppointmentRow>;

    // ── Validate required fields ──────────────────────────────
    const required: (keyof AppointmentRow)[] = [
      "repName",
      "customerName",
      "phone",
      "idNumber",
      "branch",
      "meetingDate",
      "meetingTime",
    ];

    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `שדות חסרים: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Validate branch exists in config ─────────────────────
    if (!BRANCH_SHEET_IDS[body.branch!]) {
      return NextResponse.json(
        { success: false, error: `סניף לא מוכר: ${body.branch}` },
        { status: 400 }
      );
    }

    const data: AppointmentRow = {
      repName: body.repName!,
      customerName: body.customerName!,
      phone: body.phone!,
      idNumber: body.idNumber!,
      branch: body.branch!,
      meetingDate: body.meetingDate!,
      meetingTime: body.meetingTime!,
      notes: body.notes ?? "",
    };

    // ── Write to both Google Sheets ───────────────────────────
    await appendAppointment(data);

    // ── Increment daily appointment count in Supabase ─────────
    // Non-blocking — don't fail the request if this errors
    void (async () => {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const db = createAdminClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any).rpc("increment_appointment_count", { p_user_id: user.id });
        }
      } catch {
        // non-critical
      }
    })();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[appointments]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
