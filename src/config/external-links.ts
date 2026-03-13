/**
 * ============================================================
 *  Hollandia – Centralized External Configuration
 *  Edit THIS FILE to update Sheet IDs, branches, coordinates
 *  and any external URL without touching component code.
 * ============================================================
 */

// ─── Google Sheet IDs ────────────────────────────────────────
export const MASTER_LOG_SHEET_ID =
  process.env.MASTER_LOG_SHEET_ID ?? "REPLACE_WITH_MASTER_LOG_SHEET_ID";

export const COMPLAINTS_SHEET_ID =
  process.env.COMPLAINTS_SHEET_ID ?? "REPLACE_WITH_COMPLAINTS_SHEET_ID";

/**
 * Maps each branch display name to its dedicated Google Sheet ID.
 * Add / remove branches here; the rest of the app reads from this object.
 */
export const BRANCH_SHEET_IDS: Record<string, string> = {
  "באר שבע design+":        process.env.SHEET_BEER_SHEVA       ?? "REPLACE_ME",
  "הרצליה פיתוח":           process.env.SHEET_HERZLIYA         ?? "REPLACE_ME",
  "ראשון לציון":             process.env.SHEET_RISHON           ?? "REPLACE_ME",
  "פתח תקווה":              process.env.SHEET_PETAH_TIKVA      ?? "REPLACE_ME",
  "קריית אתא":              process.env.SHEET_KIRYAT_ATA       ?? "REPLACE_ME",
  "ירושלים":                process.env.SHEET_JERUSALEM        ?? "REPLACE_ME",
  "רחובות":                 process.env.SHEET_REHOVOT          ?? "REPLACE_ME",
  "שדרות":                  process.env.SHEET_SDEROT           ?? "REPLACE_ME",
  "רמת גן":                 process.env.SHEET_RAMAT_GAN        ?? "REPLACE_ME",
};

// ─── Branch Location & Contact Data ──────────────────────────
export interface BranchInfo {
  name: string;
  lat: number;
  lng: number;
  phone: string;
  address: string;
  googleMapsUrl: string;
}

export const BRANCHES: BranchInfo[] = [
  {
    name: "באר שבע design+",
    lat: 31.2442527,
    lng: 34.8062799,
    phone: "077-231-3750",
    address: "אליהו נאוי 12, באר שבע (מתחם +Design)",
    googleMapsUrl: "https://maps.google.com/?q=אליהו+נאוי+12+באר+שבע",
  },
  {
    name: "הרצליה פיתוח",
    lat: 32.1631787,
    lng: 34.8076058,
    phone: "077-996-4711",
    address: "שד' אבא אבן 15, הרצליה פיתוח",
    googleMapsUrl: "https://maps.google.com/?q=שד+אבא+אבן+15+הרצליה+פיתוח",
  },
  {
    name: "ראשון לציון",
    lat: 31.9873956,
    lng: 34.7701127,
    phone: "077-996-4709",
    address: "רוז'נסקי 3, ראשון לציון",
    googleMapsUrl: "https://maps.google.com/?q=רוז%27נסקי+3+ראשון+לציון",
  },
  {
    name: "פתח תקווה",
    lat: 32.1015310,
    lng: 34.8916580,
    phone: "077-231-3750",
    address: "חיים סוטין 4, פתח תקווה (אזור סגולה)",
    googleMapsUrl: "https://maps.google.com/?q=חיים+סוטין+4+פתח+תקווה",
  },
  {
    name: "קריית אתא",
    lat: 32.8056688,
    lng: 35.0742819,
    phone: "077-231-7525",
    address: "דרך חיפה 44, קריית אתא (מתחם רדיזיין)",
    googleMapsUrl: "https://maps.google.com/?q=דרך+חיפה+44+קריית+אתא",
  },
  {
    name: "ירושלים",
    lat: 31.7548550,
    lng: 35.2216657,
    phone: "077-996-4713",
    address: "דרך חברון 101, ירושלים",
    googleMapsUrl: "https://maps.google.com/?q=דרך+חברון+101+ירושלים",
  },
  {
    name: "רחובות",
    lat: 31.8634640,
    lng: 34.8164190,
    phone: "077-996-4715",
    address: "צומת בילו, רחובות (בילו סנטר)",
    googleMapsUrl: "https://maps.google.com/?q=בילו+סנטר+רחובות",
  },
  {
    name: "שדרות",
    lat: 31.5229079,
    lng: 34.6110499,
    phone: "08-689-9891",
    address: "אמסטרדם 2, שדרות (חנות המפעל)",
    googleMapsUrl: "https://maps.google.com/?q=אמסטרדם+2+שדרות",
  },
  {
    name: "רמת גן",
    lat: 32.1036220,
    lng: 34.8325430,
    phone: "077-996-4712",
    address: "לח\"י 2, בני ברק (דן דיזיין סנטר)",
    googleMapsUrl: "https://maps.google.com/?q=לחי+2+בני+ברק+דן+דיזיין+סנטר",
  },
];

/** Convenience map: branch name → BranchInfo */
export const BRANCH_MAP: Record<string, BranchInfo> = Object.fromEntries(
  BRANCHES.map((b) => [b.name, b])
);

/** Ordered list of branch names for dropdowns */
export const BRANCH_NAMES = BRANCHES.map((b) => b.name);

// ─── Google Sheet Tab Names ───────────────────────────────────
/**
 * Exact tab (sheet) names as they appear inside each Google Sheets file.
 * Hebrew names, spaces, and special chars require single-quoting in the API.
 * The quoting is handled automatically by the sheets service.
 */

/** Tab name in the Master Manager (appointments) file */
export const MASTER_LOG_TAB = "Log";

/** Tab name in the Complaints file */
export const COMPLAINTS_TAB = "תלונות שירות";

/**
 * Maps branch display name → exact tab name inside that branch's Sheet file.
 * Must match the actual tab label in Google Sheets exactly (case-sensitive).
 */
export const BRANCH_TAB_NAMES: Record<string, string> = {
  "באר שבע design+":  "באר שבע - design+",
  "הרצליה פיתוח":     "הרצליה פיתוח",
  "ראשון לציון":       "ראשון לציון",
  "פתח תקווה":        "פתח תקווה / סגולה",
  "קריית אתא":        "קרית אתא - Redesign",
  "ירושלים":          "ירושלים",
  "רחובות":           "רחובות - בילו סנטר",
  "שדרות":            "שדרות חנות המפעל",
  "רמת גן":           "רמת גן",
};

// ─── Google Sheets API (server-side only) ────────────────────
export const GOOGLE_SERVICE_ACCOUNT_KEY_PATH =
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? "./credentials/service-account.json";

/**
 * For production deployments (Vercel etc.) where the filesystem is read-only,
 * set this env var to the full contents of service-account.json as a string.
 * If set, it takes priority over GOOGLE_SERVICE_ACCOUNT_KEY_PATH.
 */
export const GOOGLE_SERVICE_ACCOUNT_JSON =
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? null;

export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
];

// ─── Master Log Sheet Column Order ───────────────────────────
/** Column headers written on first use. Keep in sync with append logic. */
export const MASTER_LOG_COLUMNS = [
  "תאריך",
  "שעה",
  "שם נציג",
  "שם לקוח",
  "טלפון",
  "ת.ז",
  "סניף",
  "תאריך פגישה",
  "שעת פגישה",
  "הערות",
];

export const BRANCH_LOG_COLUMNS = [
  "תאריך",
  "שעה",
  "שם נציג",
  "שם לקוח",
  "טלפון",
  "ת.ז",
  "תאריך פגישה",
  "שעת פגישה",
  "הערות",
];

// ─── Complaints Sheet Column Order ───────────────────────────
export const COMPLAINTS_COLUMNS = [
  "תאריך",
  "שעה",
  "שם נציג",
  "שם לקוח",
  "טלפון",
  "מספר משלוח",
  "סניף",
  "פרטי תלונה",
  "הערות פנימיות",
  "סטטוס",
];

// ─── Reminders Sheet ─────────────────────────────────────────
/**
 * Source sheet for WhatsApp reminder appointments.
 * Columns: A=Customer Name, B=Phone, C=Meeting Date (DD/MM/YYYY),
 *          D=Rep Name, F=Branch, G=Meeting Time
 */
export const REMINDERS_SHEET_ID =
  process.env.REMINDERS_VERIFY_SHEET_ID ?? "1ihVioCIFOQA3PMJW1mO_Wi6PGpvvRw3KBWvHfqfQIR8";

/** Tab name inside the reminders sheet. */
export const REMINDERS_SHEET_TAB =
  process.env.REMINDERS_VERIFY_TAB || "נתונים";

// ─── WhatsApp / Messaging ─────────────────────────────────────
export const WHATSAPP_API_URL =
  process.env.WHATSAPP_API_URL ?? "REPLACE_WITH_WHATSAPP_API_URL";

export const WHATSAPP_API_TOKEN =
  process.env.WHATSAPP_API_TOKEN ?? "";

// ─── AI / LLM (Gemini) ───────────────────────────────────────
export const GEMINI_MODEL_CHAT = "gemini-2.5-flash";
export const GEMINI_MODEL_VISION = "gemini-2.5-flash";
export const GEMINI_MODEL_IMAGE = "imagen-3.0-generate-001";

// ─── Daily Reset Hour (24h, local Israel time) ───────────────
/** Productivity counters reset at this hour every day */
export const DAILY_RESET_HOUR = 7; // 07:00 AM

// ─── Internal Auth Domain ────────────────────────────────────
/**
 * Username login: we append this domain to convert "username" → "username@hollandia.internal"
 * before calling Supabase signInWithPassword. Admin creates users with this email format.
 */
export const INTERNAL_EMAIL_DOMAIN = "hollandia.internal";
