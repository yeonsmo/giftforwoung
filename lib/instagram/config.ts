import "server-only";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Feature gating for the frozen Instagram auto-upload module (spec 8).
 *
 * The integration is fully implemented but inactive. It becomes active only when
 * ALL of the following hold (spec 8-1-3):
 *   1. Credentials are present in env (app id/secret, access token, IG account).
 *   2. The FEATURE_INSTAGRAM_ENABLED env flag is true.
 *   3. The in-app menu toggle is enabled.
 *
 * Note: Instagram Graph API publishing requires a Business or Creator account,
 * a linked Facebook Page, and Meta app review (spec 8-3).
 */

const TOGGLE_KEY = "instagram_enabled";

export interface InstagramStatus {
  configured: boolean;
  featureFlag: boolean;
  toggle: boolean;
  active: boolean;
}

export function isInstagramConfigured(): boolean {
  const e = serverEnv();
  return Boolean(
    e.INSTAGRAM_APP_ID &&
      e.INSTAGRAM_APP_SECRET &&
      e.INSTAGRAM_ACCESS_TOKEN &&
      e.INSTAGRAM_BUSINESS_ACCOUNT_ID,
  );
}

export function isInstagramFeatureFlagOn(): boolean {
  return serverEnv().FEATURE_INSTAGRAM_ENABLED;
}

export async function getInstagramToggle(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", TOGGLE_KEY)
    .maybeSingle();
  return Boolean((data?.value as { enabled?: boolean } | null)?.enabled);
}

export async function setInstagramToggle(
  enabled: boolean,
  caller: { id: string },
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("system_settings").upsert(
    {
      key: TOGGLE_KEY,
      value: { enabled },
      updated_by: caller.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}

export async function getInstagramStatus(): Promise<InstagramStatus> {
  const configured = isInstagramConfigured();
  const featureFlag = isInstagramFeatureFlagOn();
  const toggle = await getInstagramToggle();
  return {
    configured,
    featureFlag,
    toggle,
    active: configured && featureFlag && toggle,
  };
}

/** Throws the frozen-feature error unless the module is fully activated. */
export async function assertInstagramActive(): Promise<void> {
  const status = await getInstagramStatus();
  if (!status.active) {
    throw new Error(
      "인스타그램 자동 업로드는 현재 구현되지 않은(동결) 기능입니다. 환경변수 자격증명, 기능 플래그(FEATURE_INSTAGRAM_ENABLED), 메뉴 토글을 모두 활성화해야 동작합니다.",
    );
  }
}
