import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secrets";

/**
 * Storage for multiple encrypted AI provider keys (spec 4-1). Key material is
 * encrypted with AES-256-GCM and only ever decrypted server-side when a model
 * is invoked. The metadata listing never includes the key value.
 */

export interface AiKeyMeta {
  id: string;
  provider: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AiKeyWithSecret extends AiKeyMeta {
  key: string;
}

interface AiKeyRow {
  id: string;
  provider: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  ciphertext: string;
  iv: string;
  auth_tag: string;
}

/** Lists key metadata (no secret values) for the settings UI. */
export async function listKeyMeta(): Promise<AiKeyMeta[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_provider_keys")
    .select("id,provider,label,is_active,created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AiKeyMeta[];
}

/** Returns active keys with decrypted values. Server-only; never sent to client. */
export async function listActiveKeys(): Promise<AiKeyWithSecret[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_provider_keys")
    .select("id,provider,label,is_active,created_at,ciphertext,iv,auth_tag")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as AiKeyRow[]).map((row) => ({
    id: row.id,
    provider: row.provider,
    label: row.label,
    is_active: row.is_active,
    created_at: row.created_at,
    key: decryptSecret({
      ciphertext: row.ciphertext,
      iv: row.iv,
      authTag: row.auth_tag,
    }),
  }));
}

export async function addKey(input: {
  provider: string;
  label: string | null;
  key: string;
  createdBy: string;
}): Promise<void> {
  const admin = createAdminClient();
  const bundle = encryptSecret(input.key);
  const { error } = await admin.from("ai_provider_keys").insert({
    provider: input.provider,
    label: input.label,
    ciphertext: bundle.ciphertext,
    iv: bundle.iv,
    auth_tag: bundle.authTag,
    created_by: input.createdBy,
  });
  if (error) throw new Error(error.message);
}

export async function deleteKey(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("ai_provider_keys").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Count of active keys, used to decide single vs debate mode (spec 4-2 / 4-3). */
export async function activeKeyCount(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("ai_provider_keys")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
