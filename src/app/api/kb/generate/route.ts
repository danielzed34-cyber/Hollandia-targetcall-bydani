/**
 * POST /api/kb/generate
 *
 * Generates a KB article using Gemini (text) + Imagen (image).
 * The article is saved with status "pending_approval" so admin can review.
 *
 * Callable by:
 * 1. Admin via the UI (authenticated)
 * 2. External cron via Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_CHAT, GEMINI_MODEL_IMAGE } from "@/config/external-links";

export const runtime = "nodejs";
export const maxDuration = 60; // image generation can be slow

// ─── Topic Pool ──────────────────────────────────────────────
const TOPICS = [
  "טיפים לשיפור איכות השינה – כיצד סביבת השינה משפיעה על הבריאות",
  "מה ההבדל בין מזרן קפיצים למזרן ויסקו? יתרונות וחסרונות",
  "מזרני Tempur – הטכנולוגיה מאחורי החומר שנוצר על ידי NASA",
  "איך לבחור כרית מתאימה – השפעת הכרית על כאבי צוואר וגב",
  "5 התנגדויות נפוצות בשיחת מכירה ואיך להתמודד איתן",
  "סיפור ההצלחה של הולנדיה – מותג ישראלי מוביל בעולם השינה",
  "טכניקת SPIN Selling – איך ליישם בשיחת תיאום פגישה",
  "למה שינה טובה = מכירה טובה? הקשר בין מנוחה לביצועים",
  "מדריך: איך להציג מזרן Tempur ללקוח בפגישה פנים אל פנים",
  "בניית אמון עם הלקוח ב-30 השניות הראשונות של השיחה",
  "השפעת המזרן על כאבי גב – מחקרים ועובדות",
  "טכניקות סגירת עסקה – מתי ואיך לשאול את שאלת הסגירה",
  "מגמות בעולם השינה 2026 – חדשנות וטכנולוגיה",
  "איך להפוך התנגדות מחיר להזדמנות מכירה",
  "יתרונות מערכות שינה מתכווננות – למה לקוחות בוחרים בהן",
  "שיחת מכירה מושלמת – שלב אחרי שלב מהפתיחה ועד הסגירה",
  "טיפים לשמירה על מזרן – איך להאריך את חיי המזרן",
  "הפסיכולוגיה של הלקוח – מה באמת מניע החלטת רכישה",
  "למה חשוב לישון על מזרן איכותי? השפעות ארוכות טווח על הבריאות",
  "איך להתמודד עם לקוח שאומר 'אני צריך לחשוב על זה'",
  "מותג Tempur vs מותגים מתחרים – נקודות מפתח להדגשה",
  "טיפים למכירה בטלפון – שפת גוף קולית ואינטונציה",
  "איך לזהות את צרכי הלקוח בשאלות פתוחות",
  "השפעת טמפרטורת החדר על איכות השינה",
  "מדריך לנציג חדש – 10 דברים שחשוב לדעת ביום הראשון",
];

const CATEGORIES = ["מכירות", "מוצרים", "שירות לקוחות", "כללי"];

const ARTICLE_SYSTEM_PROMPT = `
אתה כותב תוכן מקצועי עבור בסיס הידע הפנימי של חברת הולנדיה – מותג ישראלי מוביל למזרנים, כריות ומערכות שינה.
קהל היעד: נציגי מכירות טלפוניים שמתאמים פגישות לסניפי הולנדיה ברחבי הארץ.

כללים:
- כתוב בעברית תקינה, ברור ומעשי
- מאמר באורך 200-400 מילים
- השתמש בכותרות משנה (##) לארגון
- תן טיפים מעשיים שנציג יכול ליישם מיד
- אל תמציא מחירים או מבצעים ספציפיים
- הזכר את Tempur ואת הולנדיה בהקשר חיובי ומקצועי
- סיים עם "טיפ מהיר" אחד שניתן ליישום מיידי

הפורמט הנדרש (JSON):
{
  "title": "כותרת המאמר",
  "content": "תוכן המאמר עם ## כותרות משנה",
  "category": "אחת מ: מכירות / מוצרים / שירות לקוחות / כללי",
  "tags": ["תג1", "תג2", "תג3"],
  "imagePrompt": "תיאור באנגלית (English!) לתמונה מקצועית שמתאימה למאמר. 1-2 sentences, photorealistic style."
}

ענה אך ורק ב-JSON תקין, בלי markdown ובלי backticks.
`.trim();

// ─── Image generation via Imagen API ─────────────────────────
async function generateImage(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_IMAGE}:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: "16:9" },
        }),
      }
    );

    if (!res.ok) {
      console.error("[kb/generate] Image API error:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as {
      predictions?: { bytesBase64Encoded?: string }[];
    };
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) return null;
    return Buffer.from(b64, "base64");
  } catch (err) {
    console.error("[kb/generate] Image generation failed:", err);
    return null;
  }
}

// ─── Upload image to Supabase Storage ────────────────────────
async function uploadImage(buffer: Buffer, articleId: string): Promise<string | null> {
  const db = createAdminClient();
  const bucket = "kb-images";
  const path = `${articleId}.png`;

  // Ensure bucket exists (idempotent)
  await db.storage.createBucket(bucket, { public: true }).catch(() => {});

  const { error } = await db.storage
    .from(bucket)
    .upload(path, buffer, { contentType: "image/png", upsert: true });

  if (error) {
    console.error("[kb/generate] Storage upload error:", error.message);
    return null;
  }

  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Auth: admin or cron secret ──────────────────────────────
async function authorize(request: NextRequest): Promise<string | null> {
  // Check cron secret
  const authHeader = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Use a system user ID for cron-generated articles
    const db = createAdminClient();
    const { data } = await db
      .from("profiles")
      .select("id")
      .eq("role", "Admin")
      .limit(1)
      .single();
    return data?.id ?? null;
  }

  // Check authenticated admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "Admin") return null;

  return user.id;
}

export async function POST(request: NextRequest) {
  const adminId = await authorize(request);
  if (!adminId) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  // Pick a random topic
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

  try {
    // ── Step 1: Generate article text ────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_CHAT,
      systemInstruction: ARTICLE_SYSTEM_PROMPT,
    });

    const result = await model.generateContent(
      `כתוב מאמר מקצועי בנושא: "${topic}"`
    );
    const raw = result.response.text().trim();

    // Parse JSON (strip possible markdown fences)
    const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "");
    let parsed: {
      title: string;
      content: string;
      category: string;
      tags: string[];
      imagePrompt: string;
    };

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("[kb/generate] Failed to parse AI response:", raw.slice(0, 500));
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
    }

    // Validate category
    if (!CATEGORIES.includes(parsed.category)) {
      parsed.category = "כללי";
    }

    // ── Step 2: Save article (without image first) ───────────
    const db = createAdminClient();
    const { data: article, error: insertError } = await db
      .from("kb_articles")
      .insert({
        title: parsed.title,
        content: parsed.content,
        category: parsed.category,
        tags: parsed.tags ?? [],
        status: "pending_approval",
        ai_generated: true,
        created_by: adminId,
      })
      .select("id")
      .single();

    if (insertError || !article) {
      return NextResponse.json(
        { error: insertError?.message ?? "Insert failed" },
        { status: 500 }
      );
    }

    // ── Step 3: Generate & upload image ──────────────────────
    let imageUrl: string | null = null;
    if (parsed.imagePrompt) {
      const imageBuffer = await generateImage(parsed.imagePrompt);
      if (imageBuffer) {
        imageUrl = await uploadImage(imageBuffer, article.id);
        if (imageUrl) {
          await db
            .from("kb_articles")
            .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
            .eq("id", article.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      id: article.id,
      title: parsed.title,
      imageGenerated: !!imageUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[kb/generate]", message);

    if (
      message.includes("429") ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("rate")
    ) {
      return NextResponse.json(
        { error: "מכסת ה-AI הגיעה לגבול. נסה שוב מאוחר יותר." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
