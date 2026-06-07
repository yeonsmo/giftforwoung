/**
 * Integration smoke test (Step 10).
 *
 * Exercises the full route map against a running server using only placeholder
 * env (no real credentials needed). It verifies the security posture that does
 * not depend on external services:
 *   - public pages render (200)
 *   - protected pages redirect unauthenticated users to /login (307)
 *   - every API endpoint rejects unauthenticated/keyless calls (401)
 *
 * Anything requiring real Supabase/AI/Meta credentials (DB reads, model calls,
 * publishing) is out of scope here and is validated after credentials are set.
 *
 * Run: SMOKE_BASE_URL=http://localhost:4173 npm run test:smoke
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:4173";

interface Check {
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  expect: number | number[];
  body?: unknown;
}

const checks: Check[] = [
  // Public
  { name: "health", method: "GET", path: "/api/health", expect: 200 },
  { name: "landing", method: "GET", path: "/", expect: 200 },
  { name: "login", method: "GET", path: "/login", expect: 200 },

  // Protected pages -> redirect to /login
  { name: "dashboard", method: "GET", path: "/dashboard", expect: 307 },
  { name: "analysis page", method: "GET", path: "/analysis", expect: 307 },
  { name: "debate page", method: "GET", path: "/debate", expect: 307 },
  { name: "generate page", method: "GET", path: "/generate", expect: 307 },
  { name: "workflow page", method: "GET", path: "/workflow", expect: 307 },
  { name: "admin page", method: "GET", path: "/admin", expect: 307 },
  { name: "settings legislation", method: "GET", path: "/settings/legislation", expect: 307 },
  { name: "settings ai-keys", method: "GET", path: "/settings/ai-keys", expect: 307 },
  { name: "settings generation", method: "GET", path: "/settings/generation", expect: 307 },
  { name: "settings instagram", method: "GET", path: "/settings/instagram", expect: 307 },

  // API endpoints -> 401 unauthenticated
  { name: "admin users", method: "GET", path: "/api/admin/users", expect: 401 },
  { name: "admin api-keys", method: "GET", path: "/api/admin/api-keys", expect: 401 },
  { name: "ai-keys", method: "GET", path: "/api/ai-keys", expect: 401 },
  { name: "analysis", method: "POST", path: "/api/analysis", expect: 401, body: {} },
  { name: "uploads", method: "POST", path: "/api/uploads", expect: 401, body: {} },
  { name: "legislation status", method: "GET", path: "/api/legislation/status", expect: 401 },
  { name: "legislation key", method: "GET", path: "/api/legislation/key", expect: 401 },
  { name: "legislation collect", method: "POST", path: "/api/legislation/collect", expect: 401 },
  { name: "generation config", method: "GET", path: "/api/generation/config", expect: 401 },
  { name: "generation keys", method: "GET", path: "/api/generation/keys", expect: 401 },
  { name: "generation trend", method: "PUT", path: "/api/generation/trend", expect: 401, body: {} },
  { name: "generation", method: "POST", path: "/api/generation", expect: 401, body: {} },
  { name: "workflow generations", method: "GET", path: "/api/workflow/generations", expect: 401 },
  { name: "workflow reverify", method: "POST", path: "/api/workflow/reverify", expect: 401, body: {} },
  { name: "instagram status", method: "GET", path: "/api/instagram/status", expect: 401 },
  { name: "instagram publish", method: "POST", path: "/api/instagram/publish", expect: 401, body: {} },
  { name: "instagram toggle", method: "PUT", path: "/api/instagram/toggle", expect: 401, body: {} },
  { name: "instagram schedule", method: "POST", path: "/api/instagram/schedule", expect: 401, body: {} },
  { name: "instagram cron", method: "POST", path: "/api/instagram/cron", expect: 401 },
  // External endpoint without a key -> 401 (before any DB call)
  { name: "external analysis (no key)", method: "POST", path: "/api/external/analysis", expect: 401, body: {} },
];

async function run() {
  let passed = 0;
  const failures: string[] = [];

  for (const check of checks) {
    const expects = Array.isArray(check.expect) ? check.expect : [check.expect];
    try {
      const res = await fetch(`${BASE}${check.path}`, {
        method: check.method,
        redirect: "manual",
        headers: check.body ? { "Content-Type": "application/json" } : {},
        body: check.body ? JSON.stringify(check.body) : undefined,
      });
      const ok = expects.includes(res.status);
      console.log(`  [${ok ? "PASS" : "FAIL"}] ${check.name} -> ${res.status} (expected ${expects.join("|")})`);
      if (ok) passed += 1;
      else failures.push(`${check.name}: got ${res.status}, expected ${expects.join("|")}`);
    } catch (e) {
      console.log(`  [FAIL] ${check.name} -> error: ${(e as Error).message}`);
      failures.push(`${check.name}: ${(e as Error).message}`);
    }
  }

  console.log(`\n${passed}/${checks.length} checks passed.`);
  if (failures.length > 0) {
    console.error("FAILURES:\n" + failures.map((f) => `  - ${f}`).join("\n"));
    process.exit(1);
  }
  console.log("PASS: all smoke checks passed.");
  process.exit(0);
}

run();
