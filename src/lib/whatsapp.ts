/**
 * WhatsApp notification utility — server-side only.
 *
 * Sends messages via the local WhatsApp microservice (whatsapp-service/server.ts).
 * If the service is not running or not connected, the call is a non-blocking no-op.
 */

import { BRANCH_MAP } from "@/config/external-links";

export interface WhatsAppAppointmentPayload {
  customerName: string;
  phone: string;       // Israeli format e.g. "0501234567"
  branch: string;
  meetingDate: string; // DD/MM/YYYY
  meetingTime: string; // HH:MM
}

export interface HollandiaWAParams {
  customerName: string;
  branch: string;
  address: string;
  meetingDate: string; // YYYY-MM-DD or DD/MM/YYYY
  meetingTime: string; // HH:MM
}

/** Formats a date from YYYY-MM-DD to DD/MM/YYYY if needed */
function formatDate(d: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }
  return d;
}

/**
 * Builds the standard Hollandia appointment confirmation message.
 * Exported so the appointment form can preview/edit it before sending.
 */
export function buildHollandiaWAMessage(p: HollandiaWAParams): string {
  return [
    `שלום ${p.customerName}`,
    `בהמשך לשיחתנו טלפונית כעת ,נקבעה לך פגישה בסניף הולנדיה ${p.branch}`,
    `מועד הפגישה הינו - ${formatDate(p.meetingDate)}`,
    ` בשעה - ${p.meetingTime}`,
    `כתובת סניף - ${p.address} .`,
    `מצפים לראותך,`,
    `לכל שינוי ניתן לשלוח כאן הודעה ונענה בהקדם.`,
    `תודה ,חברת הולנדיה`,
  ].join("\n");
}

/**
 * Builds the Hebrew appointment confirmation message (legacy helper).
 */
function buildAppointmentMessage(p: WhatsAppAppointmentPayload): string {
  const branchInfo = BRANCH_MAP[p.branch];
  const address = branchInfo?.address ?? p.branch;
  return buildHollandiaWAMessage({
    customerName: p.customerName,
    branch: p.branch,
    address,
    meetingDate: p.meetingDate,
    meetingTime: p.meetingTime,
  });
}

export interface ReminderWAParams {
  customerName: string;
  branch: string;
  address: string;
  meetingDate: string; // DD/MM/YYYY
  meetingTime: string; // HH:MM
}

/**
 * Builds the appointment reminder message sent to the customer.
 * Exported so the reminders panel can preview/edit it before sending.
 */
export function buildReminderWAMessage(p: ReminderWAParams): string {
  return [
    `שלום ${p.customerName}`,
    `זוהי הודעת תזכורת בנוגע לפגישה הנקבעה בסניף ${p.branch}`,
    `מועד הפגישה הינו - ${p.meetingDate}`,
    ` בשעה : ${p.meetingTime}`,
    `כתובת סניף -${p.address}.`,
    `מצפים לראותך,`,
    `לכל שינוי ניתן לשלוח כאן הודעה ונענה בהקדם.`,
    `תודה ,חברת הולנדיה`,
  ].join("\n");
}

/**
 * Normalizes an Israeli phone number to international format (+972…).
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0")) return `+972${digits.slice(1)}`;
  return `+972${digits}`;
}

/**
 * Sends any WhatsApp message to a phone number via the local microservice.
 * Non-blocking — never throws, logs errors to console only.
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const serviceUrl = process.env.WHATSAPP_SERVICE_URL ?? "http://localhost:3001";
  const secret = process.env.WHATSAPP_SERVICE_SECRET ?? "";
  const to = normalizePhone(phone);

  try {
    const res = await fetch(`${serviceUrl}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ to, message }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[WhatsApp] Send failed (${res.status}):`, text);
    }
  } catch (err) {
    // Non-blocking — log but don't throw
    console.warn("[WhatsApp] Service unreachable:", err instanceof Error ? err.message : err);
  }
}

/**
 * Sends a Hebrew appointment confirmation message to a customer.
 */
export async function sendWhatsAppConfirmation(
  payload: WhatsAppAppointmentPayload
): Promise<void> {
  const message = buildAppointmentMessage(payload);
  await sendWhatsAppMessage(payload.phone, message);
}
