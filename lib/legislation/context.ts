import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Builds a compact legislation context string from the collected data for use
 * as grounding in the analysis prompt. Bounded in size to keep the prompt within
 * model limits. A future enhancement can replace this with embedding-based
 * retrieval; for now it provides the law-name index plus a sample of article
 * text per category.
 */
interface LegRow {
  category: string;
  law_name: string;
  article_no: string | null;
  content: string | null;
}

export async function buildLegislationContext(maxRows = 120): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("legislation")
    .select("category,law_name,article_no,content")
    .limit(maxRows);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LegRow[];
  if (rows.length === 0) {
    return "수집된 법령 데이터가 없습니다.";
  }

  const lines: string[] = [];
  for (const row of rows) {
    const article = row.article_no ? ` ${row.article_no}` : "";
    const content = row.content
      ? ` - ${row.content.slice(0, 400)}`
      : "";
    lines.push(`[${row.category}] ${row.law_name}${article}${content}`);
  }
  return lines.join("\n");
}
