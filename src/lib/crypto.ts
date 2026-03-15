import crypto from "crypto";

/** Derive a 32-byte AES key from the service role secret. No extra env var needed. */
function getKey(): Buffer {
  return crypto
    .createHash("sha256")
    .update(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "hollandia-fallback")
    .digest();
}

export function encryptPassword(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptPassword(data: string): string {
  const key = getKey();
  const buf = Buffer.from(data, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
