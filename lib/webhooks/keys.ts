import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Issuance, lookup, and revocation of the application's own API keys (spec 7).
 * Only the SHA-256 hash of each token is stored; the raw token is returned once
 * at issuance and never persisted. External callers authenticate by presenting
 * the token, which is hashed and matched against an active key.
 */

const TOKEN_PREFIX = "iac_";

export interface ApiKeyMeta {
  id: string;
  name: string | null;
  key_prefix: string;
  webhook_url: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface VerifiedKey {
  id: string;
  createdBy: string | null;
  webhookUrl: string | null;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueApiKey(input: {
  name: string | null;
  webhookUrl: string | null;
  createdBy: string;
}): Promise<{ id: string; token: string }> {
  const token = TOKEN_PREFIX + crypto.randomBytes(24).toString("hex");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_keys")
    .insert({
      name: input.name,
      key_hash: hashToken(token),
      key_prefix: token.slice(0, 12),
      webhook_url: input.webhookUrl,
      created_by: input.createdBy,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: (data as { id: string }).id, token };
}

export async function listApiKeys(): Promise<ApiKeyMeta[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_keys")
    .select("id,name,key_prefix,webhook_url,is_active,last_used_at,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ApiKeyMeta[];
}

export async function setApiKeyActive(id: string, active: boolean): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("api_keys")
    .update({ is_active: active })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteApiKey(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("api_keys").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Verifies a presented token; returns the key context or null. Updates last-used. */
export async function verifyApiKey(token: string): Promise<VerifiedKey | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_keys")
    .select("id,created_by,webhook_url,is_active")
    .eq("key_hash", hashToken(token))
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as
    | { id: string; created_by: string | null; webhook_url: string | null; is_active: boolean }
    | null;
  if (!row || !row.is_active) return null;

  await admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { id: row.id, createdBy: row.created_by, webhookUrl: row.webhook_url };
}

/** Extracts a bearer or x-api-key token from request headers. */
export function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) return apiKey.trim();
  return null;
}
