import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET - list the caller's recent generations for re-verification (spec 6-3).
 * Uses the RLS-respecting server client so users see only their own rows.
 */
export async function GET() {
  try {
    await requireApiRole(ROLES.USER);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("generations")
      .select("id,output_type,provider,brief,result,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return NextResponse.json({ generations: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}
