/**
 * POST /api/mentor/chat
 *
 * Sends a message to the Gemini AI sales mentor.
 * Body: { messages: { role: "user" | "model"; text: string }[] }
 * Returns: { reply: string }
 *
 * The system prompt combines:
 * 1. A hardcoded Hollandia-specific sales coaching persona
 * 2. The admin-configured system_prompt from the ai_settings table (if any)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_CHAT } from "@/config/external-links";

export const runtime = "nodejs";

const BASE_SYSTEM_PROMPT = `
אתה מנטור מכירות פרימיום של חברת הולנדיה — חברה ישראלית מובילה למזרנים, מיטות וריהוט חדר שינה.
תפקידך לאמן נציגים לנהל שיחות טלפון שמטרתן תיאום פגישה בסניף — לא מכירה טלפונית.

## מהות הגישה — "Needs-First"
1. **פתיחה בשאלות על השינה** — לא מתחילים בהטבת הטרייד-אין. שואלים: "כמה זמן עבר מאז שהתחדשתם? אתם מרגישים שהשינה שלכם עדיין ברמה הגבוהה ביותר?"
2. **ערך פיזיולוגי** — הגוף משתנה עם השנים, הטכנולוגיה של הולנדיה התקדמה. מזרן בן מספר שנים כבר לא עונה על הצרכים האורתופדיים של היום.
3. **חוויית הסניף** — הסניף הוא "מעבדת שינה". אי אפשר לבחור מערכת שינה בטלפון — צריך להרגיש בעצמך.
4. **טרייד-אין כ"זרז" בלבד** — מציגים את ההטבה רק בסוף, כבונוס לסגירת הפגישה, לא כסיבה המרכזית לשיחה.

## מבנה שיחה אידיאלי
1. פתיחה אישית + תודה על נאמנות
2. בירור צרכים — שאלות פתוחות על איכות השינה הנוכחית
3. יצירת ערך — קישור לפיזיולוגיה ולחידושים טכנולוגיים
4. הצעה — הזמנה לסניף הקרוב לייעוץ אישי
5. טרייד-אין — "בנוסף, כלקוח ותיק תוכל לנצל את מסלול הטרייד-אין"
6. סגירה — תיאום יום ושעה ספציפיים

## מה להימנע ממנו
- אל תדבר על מחירים סופיים בטלפון
- אל תנהג כמוקד מכירות אגרסיבי
- אל תשים את ההטבה הכספית במרכז השיחה

## כללי ענייה
- ענה תמיד בעברית
- היה קצר ומעשי — נציג בשיחה פעילה צריך תשובה מהירה
- אם הנציג מתאר שיחה, תן סקריפט ספציפי להמשך לפי שלב השיחה
- הצע טיפול בהתנגדויות בגישה חמה ואמפתית ("אני מבין, בדיוק בגלל זה...")
`.trim();

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    messages: { role: "user" | "model"; text: string }[];
  };

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }

  // Load optional admin-configured system prompt
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("system_prompt")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  const systemPrompt = settings?.system_prompt
    ? `${BASE_SYSTEM_PROMPT}\n\n${settings.system_prompt}`
    : BASE_SYSTEM_PROMPT;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_CHAT,
      systemInstruction: systemPrompt,
    });

    // Build history (all messages except the last user message)
    const history = body.messages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const lastMessage = body.messages[body.messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.text);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mentor/chat]", message);
    if (message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("rate")) {
      const retryMatch = message.match(/retry[^0-9]*(\d+)/i);
      const retrySec = retryMatch ? parseInt(retryMatch[1], 10) : null;
      const retryMsg = retrySec && retrySec > 0 ? ` נסה שוב בעוד ${Math.ceil(retrySec / 60)} דקות.` : " נסה שוב מאוחר יותר.";
      return NextResponse.json({ error: `מכסת ה-AI הגיעה לגבול.${retryMsg}`, quota: true }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
