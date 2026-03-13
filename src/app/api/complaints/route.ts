/**
 * POST /api/complaints
 *
 * Receives a customer service ticket and appends it to the Complaints sheet.
 */

import { NextRequest, NextResponse } from "next/server";
import { appendToComplaintsSheet, type ComplaintRow } from "@/lib/google/sheets";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ComplaintRow>;

    const required: (keyof ComplaintRow)[] = [
      "repName",
      "customerName",
      "phone",
      "branch",
      "complaintDetails",
    ];

    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `שדות חסרים: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const data: ComplaintRow = {
      repName: body.repName!,
      customerName: body.customerName!,
      phone: body.phone!,
      deliveryId: body.deliveryId ?? "",
      branch: body.branch!,
      complaintDetails: body.complaintDetails!,
      internalNotes: body.internalNotes ?? "",
    };

    await appendToComplaintsSheet(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[complaints]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
