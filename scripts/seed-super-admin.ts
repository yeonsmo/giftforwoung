/**
 * Seeds the single Super Admin account from environment variables.
 *
 * The Super Admin cannot be created through the UI; it exists only as this seed
 * (spec 2-3). Run once after Supabase credentials and SUPER_ADMIN_EMAIL /
 * SUPER_ADMIN_PASSWORD are set:
 *
 *   npm run db:seed
 *
 * This script is intentionally self-contained: it talks to Supabase directly and
 * does NOT import the app's "server-only"-guarded modules, because those are
 * built for the Next.js runtime and are not importable from a plain tsx script.
 *
 * Requires the role/profiles schema from supabase/migrations/0001_init.sql to be
 * applied first (the on_auth_user_created trigger creates the profile row that
 * this script then promotes to super_admin).
 */

import { createClient } from "@supabase/supabase-js";

const SUPER_ADMIN_ROLE = "super_admin";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!url || !serviceKey) {
    console.error(
      "FAIL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
    process.exit(1);
  }
  if (!email || !password) {
    console.error(
      "FAIL: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set to seed the Super Admin.",
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    // Print the raw error per spec 9-4 (no silent recovery).
    console.error(`FAIL: could not create Super Admin user: ${createError.message}`);
    process.exit(1);
  }

  const userId = created.user?.id;
  if (!userId) {
    console.error("FAIL: user creation returned no id.");
    process.exit(1);
  }

  // Promote the auto-created profile row to super_admin.
  const { error: roleError } = await admin
    .from("profiles")
    .update({ role: SUPER_ADMIN_ROLE, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (roleError) {
    console.error(`FAIL: could not assign super_admin role: ${roleError.message}`);
    process.exit(1);
  }

  console.log(`PASS: Super Admin seeded (${email}).`);
  process.exit(0);
}

main().catch((e) => {
  // Surface the raw error (spec 9-4) with a clean exit instead of a stack dump.
  console.error(`FAIL: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
