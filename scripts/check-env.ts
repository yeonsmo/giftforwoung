/**
 * Environment validation CLI.
 *
 * Reports which required variables are present and which optional server secrets
 * are still missing. Reports presence only; never prints secret values.
 *
 * Run: npm run env:check
 */

const PUBLIC_REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const SERVER_REQUIRED = ["SUPABASE_SERVICE_ROLE_KEY"];

const SERVER_OPTIONAL = [
  "APP_ENCRYPTION_KEY",
  "SUPER_ADMIN_EMAIL",
  "SUPER_ADMIN_PASSWORD",
  "MOLEG_API_KEY",
  "GENERATION_TREND_API_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "WEBHOOK_SIGNING_SECRET",
  "INSTAGRAM_APP_ID",
  "INSTAGRAM_APP_SECRET",
  "INSTAGRAM_ACCESS_TOKEN",
];

function present(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0;
}

function report(title: string, names: string[]): string[] {
  console.log(`\n${title}`);
  const missing: string[] = [];
  for (const name of names) {
    const ok = present(name);
    console.log(`  [${ok ? "OK" : "  "}] ${name}`);
    if (!ok) missing.push(name);
  }
  return missing;
}

function main() {
  console.log("Environment variable check");

  const missingPublic = report("Public (required):", PUBLIC_REQUIRED);
  const missingServerRequired = report("Server (required):", SERVER_REQUIRED);
  report("Server (optional, set as features are enabled):", SERVER_OPTIONAL);

  const hardFailures = [...missingPublic];
  if (hardFailures.length > 0) {
    console.error(
      `\nFAIL: missing required public variables: ${hardFailures.join(", ")}`,
    );
    process.exit(1);
  }

  if (missingServerRequired.length > 0) {
    console.warn(
      `\nWARN: missing required server variables (needed before deploy): ${missingServerRequired.join(", ")}`,
    );
  }

  console.log("\nPASS: required public variables are present.");
  process.exit(0);
}

main();
