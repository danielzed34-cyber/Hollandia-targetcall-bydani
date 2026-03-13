/**
 * Google Service Account authentication utility.
 * Server-side only — never imported from Client Components.
 *
 * Supports two sources for the credentials (in priority order):
 *  1. GOOGLE_SERVICE_ACCOUNT_JSON env var (full JSON string) – for production
 *  2. GOOGLE_SERVICE_ACCOUNT_KEY_PATH env var (file path)   – for local dev
 */

import { google } from "googleapis";
import fs from "fs";
import path from "path";
import {
  GOOGLE_SERVICE_ACCOUNT_JSON,
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  GOOGLE_SHEETS_SCOPES,
} from "@/config/external-links";

interface ServiceAccountKey {
  private_key: string;
  client_email: string;
}

function loadServiceAccountKey(): ServiceAccountKey {
  // Priority 1: JSON string in env var (Vercel / CI)
  if (GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON) as ServiceAccountKey;
  }

  // Priority 2: file path (local dev)
  const keyPath = path.resolve(process.cwd(), GOOGLE_SERVICE_ACCOUNT_KEY_PATH);
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Google Service Account key not found at "${keyPath}". ` +
        `Set GOOGLE_SERVICE_ACCOUNT_JSON or place the file at ${GOOGLE_SERVICE_ACCOUNT_KEY_PATH}.`
    );
  }
  const raw = fs.readFileSync(keyPath, "utf-8");
  return JSON.parse(raw) as ServiceAccountKey;
}

/**
 * Returns an authenticated JWT client scoped to Google Sheets.
 * Cached per-process so we don't re-read the key file on every request.
 */
let _authClient: InstanceType<typeof google.auth.JWT> | null = null;

export async function getGoogleAuthClient(): Promise<InstanceType<typeof google.auth.JWT>> {
  if (_authClient) return _authClient;

  const key = loadServiceAccountKey();

  _authClient = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: GOOGLE_SHEETS_SCOPES,
  });

  await _authClient.authorize();

  return _authClient;
}
