/**
 * Seeds the single Super Admin account from environment variables.
 *
 * The Super Admin cannot be created through the UI; it exists only as this seed
 * (spec 2-3). Run once after Supabase credentials and SUPER_ADMIN_EMAIL /
 * SUPER_ADMIN_PASSWORD are set.
 *
 * Run: npm run db:seed
 *
 * This script depends on the role/profiles schema from
 * supabase/migrations/0001_init.sql being applied first. The profile role
 * assignment is finalized in Step 2; in Step 1 this script is authored and
 * ready but is not expected to run until credentials exist.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { ROLES } from "@/lib/constants";

async function main() {
  const env = serverEnv();

  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) {
    console.error(
      "FAIL: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set to seed the Super Admin.",
    );
    process.exit(1);
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: env.SUPER_ADMIN_EMAIL,
    password: env.SUPER_ADMIN_PASSWORD,
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
    .update({ role: ROLES.SUPER_ADMIN })
    .eq("id", userId);

  if (roleError) {
    console.error(`FAIL: could not assign super_admin role: ${roleError.message}`);
    process.exit(1);
  }

  console.log(`PASS: Super Admin seeded (${env.SUPER_ADMIN_EMAIL}).`);
  process.exit(0);
}

main();
