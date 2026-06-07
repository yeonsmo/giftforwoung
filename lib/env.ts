import { z } from "zod";

/**
 * Environment variable validation.
 *
 * Schemas are split into public and server so that server-only secrets are
 * never imported into a client bundle. Public vars are parsed eagerly (they are
 * safe and always present at build time). Server vars are parsed lazily through
 * serverEnv() so the build does not crash when only public placeholders exist,
 * and so the server schema stays out of the client import graph.
 *
 * Only NEXT_PUBLIC_* values are exposed to the browser.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_ENCRYPTION_KEY: z.string().min(1).optional(),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(8).optional(),
  MOLEG_API_KEY: z.string().optional(),
  MOLEG_API_BASE_URL: z.string().url().default("https://www.law.go.kr/DRF"),
  LEGISLATION_UPDATE_INTERVAL_DAYS: z.coerce.number().int().positive().default(91),
  AI_DEFAULT_PROVIDER: z.string().default("gemini"),
  AI_DEBATE_MIN_KEYS: z.coerce.number().int().positive().default(2),
  GENERATION_TREND_API_BASE_URL: z.string().url().optional().or(z.literal("")),
  GENERATION_TREND_API_KEY: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["supabase", "vercel_blob"]).default("supabase"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(512),
  WEBHOOK_SIGNING_SECRET: z.string().optional(),
  FEATURE_INSTAGRAM_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

export const publicEnv: PublicEnv = publicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

let cachedServerEnv: ServerEnv | null = null;

/**
 * Parse and return server-only environment variables. Call ONLY from server
 * code (route handlers, server components, scripts). Result is cached.
 */
export function serverEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  cachedServerEnv = serverSchema.parse(process.env);
  return cachedServerEnv;
}
