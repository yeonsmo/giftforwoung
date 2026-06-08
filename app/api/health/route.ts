import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health check. Reports service status and configuration presence only.
 * It never connects to Supabase and never returns any secret value.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "insurance-ad-compliance",
    time: new Date().toISOString(),
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });
}
