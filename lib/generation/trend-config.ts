import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import {
  getSecret,
  getSecretMeta,
  setSecret,
  deleteSecret,
} from "@/lib/legislation/secrets-store";

/**
 * External trend API configuration (spec 5-3-2). Designed to be generic so any
 * API can be connected: an endpoint URL, an optional API key (sent as a Bearer
 * token), and a parsing rule (a dot-path into the JSON response). The endpoint
 * and parsing rule are non-secret config in system_settings; the key is stored
 * encrypted in app_secrets.
 */

const TREND_SETTING_KEY = "trend_api";
const TREND_SECRET_NAME = "trend_api_key";

export interface TrendConfig {
  endpoint: string | null;
  parsing: string | null;
  keyConfigured: boolean;
}

export async function getTrendConfig(): Promise<TrendConfig> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", TREND_SETTING_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const value = (data?.value ?? {}) as { endpoint?: string; parsing?: string };
  const envEndpoint = serverEnv().GENERATION_TREND_API_BASE_URL;
  const meta = await getSecretMeta(TREND_SECRET_NAME);

  return {
    endpoint: value.endpoint || (envEndpoint ? envEndpoint : null),
    parsing: value.parsing || null,
    keyConfigured: meta.configured || Boolean(serverEnv().GENERATION_TREND_API_KEY),
  };
}

export async function setTrendConfig(
  input: { endpoint: string; parsing: string; key?: string },
  caller: { id: string },
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("system_settings").upsert(
    {
      key: TREND_SETTING_KEY,
      value: { endpoint: input.endpoint, parsing: input.parsing },
      updated_by: caller.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);

  if (input.key !== undefined) {
    if (input.key === "") {
      await deleteSecret(TREND_SECRET_NAME);
    } else {
      await setSecret(TREND_SECRET_NAME, input.key, {
        lockedBySuperAdmin: false,
        updatedBy: caller.id,
      });
    }
  }
}

export async function getTrendApiKey(): Promise<string | null> {
  const stored = await getSecret(TREND_SECRET_NAME);
  if (stored) return stored;
  return serverEnv().GENERATION_TREND_API_KEY ?? null;
}
