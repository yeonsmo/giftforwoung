import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses Row Level Security. SERVER-ONLY.
 *
 * Used for privileged operations: the Super Admin seed script, role enforcement,
 * and reading/writing encrypted secrets. Never import this into client code; the
 * "server-only" guard turns an accidental client import into a build error.
 */
export function createAdminClient() {
  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
