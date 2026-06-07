import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secrets";
import { KEY_CATEGORIES } from "@/lib/constants";

/**
 * Storage for multiple encrypted provider keys (spec 4-1 / 5-2). Key material is
 * encrypted with AES-256-GCM and only ever decrypted server-side when a model
 * is invoked. The metadata listing never includes the key value.
 *
 * Keys are scoped by category: 'llm' (analysis/copywriting), 'image', 'video'.
 * Analysis only ever loads 'llm' keys, so image/video keys never get run as LLMs.
 */

export interface AiKeyMeta {
  id: string;
  provider: string;
  label: string | null;
  category: string;
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
  category: string;
  is_active: boolean;
  created_at: string;
  ciphertext: string;
  iv: string;
  auth_tag: string;
}

/** Lists key metadata (no secret values). Optionally filtered by category. */
export async function listKeyMeta(category?: string): Promise<AiKeyMeta[]> {
  const admin = createAdminClient();
  let query = admin
    .from("ai_provider_keys")
    .select("id,provider,label,category,is_active,created_at")
    .order("created_at", { ascending: true });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AiKeyMeta[];
}

/** Returns active keys with decrypted values. Server-only; never sent to client. */
export async function listActiveKeys(
  category: string = KEY_CATEGORIES.LLM,
): Promise<AiKeyWithSecret[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_provider_keys")
    .select("id,provider,label,category,is_active,created_at,ciphertext,iv,auth_tag")
    .eq("is_active", true)
    .eq("category", category)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as AiKeyRow[]).map((row) => ({
    id: row.id,
    provider: row.provider,
    label: row.label,
    category: row.category,
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
  category?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const bundle = encryptSecret(input.key);
  const { error } = await admin.from("ai_provider_keys").insert({
    provider: input.provider,
    label: input.label,
    category: input.category ?? KEY_CATEGORIES.LLM,
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

/** Count of active keys in a category. Used to decide single vs debate (4-2/4-3). */
export async function activeKeyCount(
  category: string = KEY_CATEGORIES.LLM,
): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("ai_provider_keys")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("category", category);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Returns the first active key with secret for a provider in a category, or null. */
export async function firstActiveKeyForProvider(
  provider: string,
  category: string,
): Promise<AiKeyWithSecret | null> {
  const keys = await listActiveKeys(category);
  return keys.find((k) => k.provider === provider) ?? null;
}
