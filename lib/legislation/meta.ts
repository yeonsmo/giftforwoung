import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

/**
 * 91-day update counter (spec 3-3). This module is intentionally independent of
 * the 법제처 API key: it only reads/writes legislation_meta and never touches
 * app_secrets. Deleting the key does not affect the counter (spec 3-1-3).
 */

export interface LegislationStatus {
  hasData: boolean;
  firstCollectedAt: string | null;
  lastCollectedAt: string | null;
  totalCount: number;
  intervalDays: number;
  daysSinceLast: number | null;
  updateDue: boolean;
}

interface MetaRow {
  first_collected_at: string | null;
  last_collected_at: string | null;
  total_count: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function getLegislationStatus(): Promise<LegislationStatus> {
  const intervalDays = serverEnv().LEGISLATION_UPDATE_INTERVAL_DAYS;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("legislation_meta")
    .select("first_collected_at,last_collected_at,total_count")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const row = (data as MetaRow | null) ?? {
    first_collected_at: null,
    last_collected_at: null,
    total_count: 0,
  };

  let daysSinceLast: number | null = null;
  if (row.last_collected_at) {
    const elapsed = Date.now() - new Date(row.last_collected_at).getTime();
    daysSinceLast = Math.floor(elapsed / MS_PER_DAY);
  }

  return {
    hasData: row.total_count > 0,
    firstCollectedAt: row.first_collected_at,
    lastCollectedAt: row.last_collected_at,
    totalCount: row.total_count,
    intervalDays,
    daysSinceLast,
    updateDue: daysSinceLast !== null && daysSinceLast >= intervalDays,
  };
}

/** Records a completed collection: sets first date if unset, updates last date and count. */
export async function recordCollection(totalCount: number): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data } = await admin
    .from("legislation_meta")
    .select("first_collected_at")
    .eq("id", 1)
    .maybeSingle();
  const firstCollectedAt =
    (data as { first_collected_at: string | null } | null)?.first_collected_at ??
    now;

  const { error } = await admin.from("legislation_meta").upsert(
    {
      id: 1,
      first_collected_at: firstCollectedAt,
      last_collected_at: now,
      total_count: totalCount,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}
