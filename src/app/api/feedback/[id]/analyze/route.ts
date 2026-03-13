/**
 * POST /api/feedback/[id]/analyze
 *
 * Admin-only. Upload an MP3 file to transcribe + generate a full AI feedback report.
 * Accepts multipart/form-data with an "audio" file field.
 * On success: status → "done", transcript and report are saved, rep is notified via real-time.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_CHAT } from "@/config/external-links";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "Admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audioFile = formData.get("audio") as File | null;
  if (!audioFile) {
    return NextResponse.json({ error: "audio file required" }, { status: 400 });
  }
  if (audioFile.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "קובץ גדול מדי — מקסימום 20MB" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get the feedback request
  const { data: reqRaw, error: fetchErr } = await admin
    .from("feedback_requests")
    .select("rep_name, customer_name, customer_phone, struggle_point")
    .eq("id", id)
    .single();

  if (fetchErr || !reqRaw) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const req = reqRaw as { rep_name: string; customer_name: string; customer_phone: string; struggle_point: string };

  // Mark as processing
  await admin
    .from("feedback_requests")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", id);

  // Convert audio to base64
  const audioBuffer = await audioFile.arrayBuffer();
  const audioBase64 = Buffer.from(audioBuffer).toString("base64");
  const mimeType = audioFile.type || "audio/mpeg";

  const notes = req.struggle_point?.trim();
  const prompt = `אתה מנטור מכירות פרימיום של חברת הולנדיה — חברה ישראלית מובילה למזרנים, מיטות וריהוט חדר שינה.
קיבלת הקלטת שיחה של הנציג "${req.rep_name}" עם לקוח בשם ${req.customer_name}.${notes ? `\nהנציג ציין: "${notes}"` : ""}

## מתודולוגיית "Needs-First" של הולנדיה (בסיס להערכה):
- מטרת השיחה היא תיאום פגישה בסניף — לא מכירה טלפונית
- השיחה האידיאלית מתחילה בשאלות על איכות השינה של הלקוח, לא בהטבת הטרייד-אין
- הנציג צריך להדגיש שהגוף משתנה עם השנים וטכנולוגיית הולנדיה התקדמה
- הסניף מוצג כ"מעבדת שינה" — חוויה שאי אפשר לשחזר בטלפון
- הטבת הטרייד-אין מוצגת רק כ"זרז" לקראת סגירת הפגישה, לא כנושא המרכזי
- יש להימנע מדיון במחירים סופיים בטלפון ומגישה של מוקד מכירות אגרסיבי

## מבנה שיחה אידיאלי להשוואה:
1. פתיחה אישית + תודה על נאמנות הלקוח
2. בירור צרכים — שאלות פתוחות על איכות השינה הנוכחית
3. יצירת ערך — קישור לשינויים פיזיולוגיים ולחידושים טכנולוגיים
4. הצעה — הזמנה לסניף הקרוב לייעוץ אישי
5. טרייד-אין — הצגה כבונוס לסגירה
6. סגירה — תיאום יום ושעה ספציפיים

שלב 1: תמלל את השיחה המצורפת במלואה.
שלב 2: נתח את השיחה לפי מתודולוגיית Needs-First של הולנדיה וצור דוח משוב מפורט.

השב JSON בלבד (ללא markdown, ללא הסברים), עם המבנה הבא:
{
  "transcript": "תמליל מלא של השיחה כפי שנאמרה",
  "summary": "סיכום קצר של השיחה ב-2-3 משפטים",
  "strengths": ["נקודת שימור 1 — מה הנציג עשה טוב לפי גישת Needs-First ויש לשמר", "נקודת שימור 2"],
  "improvements": ["נקודת שיפור 1 — מה ניתן לשפר לפי המתודולוגיה ואיך", "נקודת שיפור 2"],
  "script_suggestion": "הצעה קונקרטית לניסוח מומלץ לשיחה דומה בעתיד לפי גישת הולנדיה",
  "score": 7
}`.trim();

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_CHAT });

    const result = await model.generateContent([
      { inlineData: { mimeType, data: audioBase64 } },
      prompt,
    ]);

    const text = result.response.text().trim();
    const jsonText = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const report = JSON.parse(jsonText) as Record<string, string | number | boolean | null>;

    const transcript = typeof report["transcript"] === "string" ? report["transcript"] : null;

    await admin
      .from("feedback_requests")
      .update({
        status: "done",
        transcript,
        report,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ success: true, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[feedback/analyze]", message);

    await admin
      .from("feedback_requests")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("rate")) {
      const retryMatch = message.match(/retry[^0-9]*(\d+)/i);
      const retrySec = retryMatch ? parseInt(retryMatch[1], 10) : null;
      const retryMsg = retrySec && retrySec > 0 ? ` נסה שוב בעוד ${Math.ceil(retrySec / 60)} דקות.` : " נסה שוב מאוחר יותר.";
      return NextResponse.json({ success: false, error: `מכסת ה-AI הגיעה לגבול.${retryMsg}`, quota: true }, { status: 429 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
