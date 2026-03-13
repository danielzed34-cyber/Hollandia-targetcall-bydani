/**
 * /api/script/[id]/ai
 *
 * POST – ask Gemini to rewrite a specific script section
 *        body: { sectionKey: "section_1" | ... | "section_6", instruction: string, currentText: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_CHAT } from "@/config/external-links";

export const runtime = "nodejs";

const SECTION_NAMES: Record<string, string> = {
  section_1: "פתיחת השיחה",
  section_2: "התחברות רגשית",
  section_3: "הצגת הערך והחשיבות",
  section_4: "הצגת ההטבה",
  section_5: "קביעת פגישה",
  section_6: "סיכום השיחה",
};

// Built-in suggestion prompts — aligned with Hollandia's "Needs-First" methodology
const HOLLANDIA_CONTEXT = `
הקשר: הולנדיה היא חברה ישראלית פרימיום למזרנים, מיטות וריהוט חדר שינה.
מטרת השיחה: תיאום פגישה בסניף — לא מכירה טלפונית.
גישה: "Needs-First" — מתחילים בצרכי הלקוח ואיכות השינה, לא בהטבה כספית.
הסניף הוא "מעבדת שינה" — חוויה שאי אפשר לשחזר בטלפון.
הטבת הטרייד-אין מוצגת רק כ"זרז" לקראת סגירת הפגישה.
`.trim();

const SUGGEST_PROMPTS: Record<string, string> = {
  section_1: `${HOLLANDIA_CONTEXT}

כתוב פתיחת שיחה קצרה ואפקטיבית — פנייה אישית ללקוח קיים.
הפתיחה צריכה:
- להציג את הנציג בשמו (השתמש ב-[שם הנציג] כ-placeholder) ולציין שהוא מהולנדיה
- לפנות ללקוח בשמו ([שם הלקוח]) ולהודות לו על הנאמנות לאורך השנים
- ליצור עניין ראשוני בנושא השינה — בטון מכבד, אמפתי ויוקרתי
- לא לציין הטבות כספיות בשלב זה
2-3 משפטים בלבד.`,

  section_2: `${HOLLANDIA_CONTEXT}

כתוב חלק "בירור צרכים" לשיחת הולנדיה — זהו הלב של גישת Needs-First.
המטרה: לשאול שאלות פתוחות שיגלו את מצב השינה הנוכחי של הלקוח.
כלול שאלות כמו:
- "כמה זמן כבר עבר מאז שהתחדשתם?"
- "אתם מרגישים שהשינה שלכם עדיין ברמה הגבוהה ביותר?"
- "יש כאבי גב בבוקר? תחושה שהמזרן פחות תומך מבעבר?"
הראה אמפתיה אמיתית לנושא השינה. 3-4 משפטים.`,

  section_3: `${HOLLANDIA_CONTEXT}

כתוב חלק "יצירת ערך" — קשר בין תשובות הלקוח לצורך בהתחדשות.
כלול:
- הגוף משתנה עם השנים — גם צרכי התמיכה האורתופדית משתנים
- טכנולוגיית הולנדיה התקדמה משמעותית — מזרן בן מספר שנים לא מעניק את אותה תמיכה שהגוף צריך היום
- שינה איכותית היא צורך קיומי — בריאות, ריכוז, איכות חיים — לא מותרות
- אי אפשר לבחור מערכת שינה בטלפון — הסניף הוא "מעבדת שינה" שבה מרגישים את ההבדל
3-4 משפטים.`,

  section_4: `${HOLLANDIA_CONTEXT}

כתוב חלק "הזמנה לסניף" — ההצעה לפגישת ייעוץ אישית.
הדגש:
- ייעוץ שינה אישי ומקצועי ללא עלות
- אבחון מותאם אישית לפי גיל, משקל ובעיות גב
- אפשרות לנסות פיזית ולהרגיש את ההבדל בעצמך
- הסניף כחוויה ייחודית — לא מה שמקבלים בטלפון או באינטרנט
הצג זאת כהזדמנות שלא כדאי לפספס. 2-3 משפטים.`,

  section_5: `${HOLLANDIA_CONTEXT}

כתוב חלק "הטבת הטרייד-אין" — מוצגת כ"זרז" לסגירת הפגישה בלבד.
חשוב: זה לא המסר המרכזי — זהו בונוס ללקוח ותיק.
הצג כך: "בנוסף לכל זה, בגלל שאתה לקוח ותיק שלנו, תוכל גם לנצל את מסלול הטרייד-אין הייחודי..."
הסבר בקצרה שניתן להחזיר את המזרן הישן ולהתקזז כלפי מערכת חדשה.
אל תציין מחיר סופי. 2-3 משפטים.`,

  section_6: `${HOLLANDIA_CONTEXT}

כתוב חלק "קביעת פגישה וסגירה".
כלול:
- טכניקת "ברירת מחדל חיובית": הצע שני מועדים קונקרטיים ("[יום א׳ בבוקר] או [יום ג׳ אחרי הצהריים] — מה יותר נוח?")
- אם הלקוח מתנגד ("צריך לחשוב") — טפל בחמימות: "אני מבין, בדיוק בגלל זה כדאי לראות ולהרגיש בעצמך לפני שמחליטים"
- סיכום: חזרה על מה הוסכם ([שם הנציג], [מועד הפגישה], [סניף])
- הבטחה לשלוח SMS לאישור
- משפט חם שיוצר ציפייה חיובית לביקור
3-4 משפטים.`,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify script belongs to user
  const { data: existing } = await supabase
    .from("call_scripts")
    .select("id, rep_id, status")
    .eq("id", id)
    .eq("rep_id", user.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["draft", "rejected"].includes(existing.status)) {
    return NextResponse.json({ error: "Script is not editable" }, { status: 400 });
  }

  const body = await request.json() as {
    sectionKey: string;
    mode?: "edit" | "suggest";
    instruction?: string;
    currentText?: string;
  };

  if (!body.sectionKey || !SECTION_NAMES[body.sectionKey]) {
    return NextResponse.json({ error: "sectionKey invalid" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const sectionName = SECTION_NAMES[body.sectionKey];
  const mode = body.mode ?? "edit";

  let prompt: string;

  if (mode === "suggest") {
    const basePrompt = SUGGEST_PROMPTS[body.sectionKey];
    prompt = `אתה עוזר AI לנציגי מכירות של חברת הולנדיה (חברה לריהוט ועיצוב הבית).

${basePrompt}

הנחיות:
- כתוב בעברית בלבד, גוף ראשון (כאילו הנציג מדבר)
- שפה חמה, מקצועית ואנושית — לא רובוטית
- החזר רק את טקסט החלק עצמו, ללא כותרות או הסברים`;
  } else {
    prompt = `אתה עוזר AI לנציגי מכירות של חברת הולנדיה — חברה ישראלית פרימיום למזרנים, מיטות וריהוט חדר שינה.
מטרת השיחה: תיאום פגישה בסניף (לא מכירה טלפונית). גישה: "Needs-First" — מתחילים בצרכי הלקוח, הטרייד-אין מוצג רק כזרז לסגירה.

משימה: ערוך את החלק "${sectionName}" בתסריט השיחה.

הטקסט הנוכחי:
"""
${body.currentText || "(ריק)"}
"""

הוראות הנציג:
${body.instruction ?? ""}

הנחיות:
- כתוב בעברית בלבד, גוף ראשון (הנציג מדבר)
- שמור על טון מכבד, אמפתי, מקצועי ויוקרתי — לא אגרסיבי
- החלק צריך להיות קצר, ממוקד וישיר
- אל תציין מחירים סופיים
- החזר רק את הטקסט הערוך של החלק, ללא הסברים נוספים`;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_CHAT });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[script/ai] Gemini error:", msg);

    // True quota exhaustion (daily limit)
    if (msg.includes("quota") || (msg.includes("429") && msg.includes("free_tier"))) {
      const retryMatch = msg.match(/retry[^0-9]*(\d+)/i);
      const retrySec = retryMatch ? parseInt(retryMatch[1], 10) : null;
      const retryMsg = retrySec && retrySec > 0
        ? ` נסה שוב בעוד ${Math.ceil(retrySec / 60)} דקות.`
        : " נסה שוב מאוחר יותר.";
      return NextResponse.json(
        { error: `מכסת ה-AI היומית הגיעה לגבול.${retryMsg}`, quota: true },
        { status: 429 }
      );
    }
    // Rate limit (per-minute)
    if (msg.includes("429")) {
      return NextResponse.json(
        { error: "יותר מדי בקשות — המתן מספר שניות ונסה שוב.", quota: false },
        { status: 429 }
      );
    }
    // Model not found or other API error — pass raw message
    return NextResponse.json({ error: `שגיאת AI: ${msg}` }, { status: 500 });
  }
}
