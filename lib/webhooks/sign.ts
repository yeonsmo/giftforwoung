import "server-only";
import crypto from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Outbound webhook delivery with HMAC-SHA256 signing (spec 7). The signature is
 * sent in the X-Signature-256 header as "sha256=<hex>" so receivers can verify
 * the payload using the shared WEBHOOK_SIGNING_SECRET.
 */

export function signPayload(body: string): string | null {
  const secret = serverEnv().WEBHOOK_SIGNING_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export interface WebhookDelivery {
  delivered: boolean;
  status?: number;
  error?: string;
}

export async function sendWebhook(
  url: string,
  payload: unknown,
): Promise<WebhookDelivery> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature ? { "X-Signature-256": `sha256=${signature}` } : {}),
      },
      body,
    });
    return { delivered: res.ok, status: res.status };
  } catch (e) {
    return { delivered: false, error: e instanceof Error ? e.message : String(e) };
  }
}
