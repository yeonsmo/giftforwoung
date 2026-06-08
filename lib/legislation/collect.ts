import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { getSecret, MOLEG_KEY_NAME } from "@/lib/legislation/secrets-store";
import { CATEGORY_QUERIES, allCategories } from "@/lib/legislation/categories";
import { searchLaws, fetchLawDetail, type MolegLawSummary } from "@/lib/legislation/moleg";
import { recordCollection } from "@/lib/legislation/meta";

/** Cap on statutes fetched in detail per category, to respect serverless time limits. */
const MAX_DETAIL_PER_CATEGORY = 20;

export interface CollectionResult {
  totalRows: number;
  perCategory: Record<string, number>;
  errors: string[];
}

interface LegislationInsert {
  category: string;
  law_name: string;
  law_id: string | null;
  article_no: string | null;
  content: string | null;
  source_url: string | null;
  raw: unknown;
}

/**
 * Collects legislation for all seven categories using the configured 법제처 key
 * and stores the results. Replaces existing rows (full refresh) so the data set
 * reflects the latest collection. Requires the key to be configured; per spec
 * 3-4, analysis still works on existing data when no key is present, but a new
 * collection cannot run without one.
 */
export async function collectAllLegislation(): Promise<CollectionResult> {
  const oc = await getSecret(MOLEG_KEY_NAME);
  if (!oc) {
    throw new Error(
      "법제처 API 키가 설정되어 있지 않습니다. 설정 메뉴에서 키를 입력한 후 다시 시도하십시오.",
    );
  }
  const baseUrl = serverEnv().MOLEG_API_BASE_URL;
  const admin = createAdminClient();

  const rows: LegislationInsert[] = [];
  const perCategory: Record<string, number> = {};
  const errors: string[] = [];

  for (const category of allCategories()) {
    let categoryCount = 0;
    const queries = CATEGORY_QUERIES[category];
    const seen = new Set<string>();

    for (const query of queries) {
      let summaries: MolegLawSummary[];
      try {
        summaries = await searchLaws(oc, query, baseUrl);
      } catch (e) {
        errors.push(`[${category}] 검색 실패 "${query}": ${(e as Error).message}`);
        continue;
      }

      let detailFetched = 0;
      for (const summary of summaries) {
        const dedupeKey = summary.lawId ?? summary.lawName;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        // Always store the summary row.
        let storedDetail = false;
        if (summary.lawId && detailFetched < MAX_DETAIL_PER_CATEGORY) {
          try {
            const detail = await fetchLawDetail(oc, summary.lawId, baseUrl);
            detailFetched += 1;
            for (const article of detail.articles) {
              rows.push({
                category,
                law_name: detail.lawName,
                law_id: detail.lawId,
                article_no: article.articleNo,
                content: article.content,
                source_url: detail.sourceUrl,
                raw: null,
              });
              categoryCount += 1;
            }
            storedDetail = detail.articles.length > 0;
          } catch (e) {
            errors.push(
              `[${category}] 상세 조회 실패 "${summary.lawName}": ${(e as Error).message}`,
            );
          }
        }

        if (!storedDetail) {
          rows.push({
            category,
            law_name: summary.lawName,
            law_id: summary.lawId,
            article_no: null,
            content: null,
            source_url: null,
            raw: summary.raw,
          });
          categoryCount += 1;
        }
      }
    }
    perCategory[category] = categoryCount;
  }

  // Full refresh: clear then insert. Done via service role.
  const { error: deleteError } = await admin
    .from("legislation")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) throw new Error(deleteError.message);

  if (rows.length > 0) {
    // Insert in batches to stay within request size limits.
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error: insertError } = await admin
        .from("legislation")
        .insert(rows.slice(i, i + BATCH));
      if (insertError) throw new Error(insertError.message);
    }
  }

  await recordCollection(rows.length);

  return { totalRows: rows.length, perCategory, errors };
}
