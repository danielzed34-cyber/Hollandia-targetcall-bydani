/**
 * WhatsApp Microservice
 *
 * Standalone Express server that holds a whatsapp-web.js client.
 * Runs on port 3001 alongside the Next.js app (port 3000).
 *
 * Endpoints:
 *   GET  /status  → { connected: bool, qr: string|null }
 *   POST /send    → { to: "+972...", message: "..." }
 *
 * All /send requests must include: Authorization: Bearer <WHATSAPP_SERVICE_SECRET>
 *
 * Start: tsx watch whatsapp-service/server.ts
 */

import express from "express";
import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode";

const PORT = parseInt(process.env.WHATSAPP_SERVICE_PORT ?? "3001", 10);
const SECRET = process.env.WHATSAPP_SERVICE_SECRET ?? "";

// ── State ─────────────────────────────────────────────────────
let clientReady = false;
let latestQR: string | null = null; // base64 PNG data URL

// ── WhatsApp Client ───────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  },
});

client.on("qr", async (qr) => {
  console.log("[WhatsApp] QR received — open /dashboard/admin/whatsapp to scan");
  try {
    latestQR = await qrcode.toDataURL(qr);
  } catch (err) {
    console.error("[WhatsApp] Failed to generate QR image:", err);
  }
});

client.on("ready", () => {
  console.log("[WhatsApp] Client ready — connected!");
  clientReady = true;
  latestQR = null;
});

client.on("authenticated", () => {
  console.log("[WhatsApp] Authenticated successfully");
});

client.on("auth_failure", (msg) => {
  console.error("[WhatsApp] Auth failure:", msg);
  clientReady = false;
});

client.on("disconnected", (reason) => {
  console.warn("[WhatsApp] Disconnected:", reason);
  clientReady = false;
  latestQR = null;
  // Re-initialize after a short delay
  setTimeout(() => {
    console.log("[WhatsApp] Re-initializing...");
    client.initialize().catch(console.error);
  }, 5000);
});

console.log("[WhatsApp] Initializing client...");
client.initialize().catch(console.error);

// ── Express Server ────────────────────────────────────────────
const app = express();
app.use(express.json());

// Auth middleware for protected routes
function requireSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!SECRET) {
    // No secret configured — allow all (dev mode)
    next();
    return;
  }
  const auth = req.headers.authorization ?? "";
  if (auth !== `Bearer ${SECRET}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// GET /status — public (Next.js admin route already guards access)
app.get("/status", (_req, res) => {
  res.json({ connected: clientReady, qr: latestQR });
});

// POST /send
app.post("/send", requireSecret, async (req, res) => {
  const { to, message } = req.body as { to?: string; message?: string };

  if (!to || !message) {
    res.status(400).json({ error: "to and message are required" });
    return;
  }

  if (!clientReady) {
    res.status(503).json({ error: "WhatsApp client not connected" });
    return;
  }

  try {
    // whatsapp-web.js expects the number in the format "9720501234567@c.us"
    const digits = to.replace(/\D/g, "");
    const chatId = digits.startsWith("972")
      ? `${digits}@c.us`
      : `972${digits.startsWith("0") ? digits.slice(1) : digits}@c.us`;

    await client.sendMessage(chatId, message);
    console.log(`[WhatsApp] Message sent to ${chatId}`);
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp] Send error:", msg);
    res.status(500).json({ error: msg });
  }
});

app.listen(PORT, () => {
  console.log(`[WhatsApp] Service running on http://localhost:${PORT}`);
});
