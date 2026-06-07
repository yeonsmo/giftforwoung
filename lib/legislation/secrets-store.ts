import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secrets";

/** Secret name for the 법제처 (MOLEG) API key. */
export const MOLEG_KEY_NAME = "moleg_api_key";

export interface SecretMeta {
  configured: boolean;
  superAdminLocked: boolean;
  updatedAt: string | null;
}

interface SecretRow {
  ciphertext: string;
  iv: string;
  auth_tag: string;
  super_admin_locked: boolean;
  updated_at: string;
}

/** Returns the decrypted secret value, or null if not configured. */
export async function getSecret(name: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("app_secrets")
    .select("ciphertext,iv,auth_tag")
    .eq("name", name)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Pick<SecretRow, "ciphertext" | "iv" | "auth_tag">;
  return decryptSecret({
    ciphertext: row.ciphertext,
    iv: row.iv,
    authTag: row.auth_tag,
  });
}

/** Returns presence/lock metadata without exposing the secret value. */
export async function getSecretMeta(name: string): Promise<SecretMeta> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("app_secrets")
    .select("super_admin_locked,updated_at")
    .eq("name", name)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return { configured: false, superAdminLocked: false, updatedAt: null };
  }
  const row = data as Pick<SecretRow, "super_admin_locked" | "updated_at">;
  return {
    configured: true,
    superAdminLocked: row.super_admin_locked,
    updatedAt: row.updated_at,
  };
}

export async function setSecret(
  name: string,
  plaintext: string,
  opts: { lockedBySuperAdmin: boolean; updatedBy: string },
): Promise<void> {
  const admin = createAdminClient();
  const bundle = encryptSecret(plaintext);
  const { error } = await admin.from("app_secrets").upsert(
    {
      name,
      ciphertext: bundle.ciphertext,
      iv: bundle.iv,
      auth_tag: bundle.authTag,
      super_admin_locked: opts.lockedBySuperAdmin,
      updated_by: opts.updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" },
  );
  if (error) throw new Error(error.message);
}

export async function deleteSecret(name: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("app_secrets").delete().eq("name", name);
  if (error) throw new Error(error.message);
}
