import "server-only";

/**
 * Client for the 국가법령정보 공동활용 (법제처 OPEN API).
 *
 * The API authenticates with an "OC" value (the registered user id). The spec
 * refers to this as the "법제처 API 키"; it is stored encrypted and passed here.
 * Base URL is configurable via MOLEG_API_BASE_URL (default https://www.law.go.kr/DRF).
 *
 * Endpoints:
 *   - lawSearch.do  : search statutes by name (returns a list).
 *   - lawService.do : fetch a single statute's detail (articles).
 *
 * The OPEN API returns JSON when type=JSON. Field names vary by target, so the
 * parsing below is defensive: it extracts arrays/strings wherever they appear.
 * Exact field mapping should be confirmed against a live response once a real
 * key is available; unknown shapes are preserved in the `raw` field.
 */

export interface MolegLawSummary {
  lawId: string | null;
  lawName: string;
  raw: unknown;
}

export interface MolegArticle {
  articleNo: string | null;
  content: string;
}

export interface MolegLawDetail {
  lawId: string | null;
  lawName: string;
  articles: MolegArticle[];
  sourceUrl: string;
  raw: unknown;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

/** Recursively finds the first array of objects under a likely results key. */
function findResultArray(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    // Common containers in the OPEN API responses.
    for (const key of ["law", "Law", "LawSearch", "lawSearch", "list"]) {
      if (key in obj) {
        const inner = obj[key];
        const arr = asArray(inner).filter(
          (x) => x && typeof x === "object",
        ) as Record<string, unknown>[];
        if (arr.length) return arr;
        const nested = findResultArray(inner);
        if (nested.length) return nested;
      }
    }
    for (const value of Object.values(obj)) {
      const nested = findResultArray(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`법제처 API 요청 실패 (HTTP ${res.status}): ${url}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("법제처 API 응답을 JSON으로 해석하지 못했습니다.");
  }
}

export async function searchLaws(
  oc: string,
  query: string,
  baseUrl: string,
): Promise<MolegLawSummary[]> {
  const url =
    `${baseUrl}/lawSearch.do?OC=${encodeURIComponent(oc)}` +
    `&target=law&type=JSON&display=100&query=${encodeURIComponent(query)}`;
  const json = await fetchJson(url);
  const items = findResultArray(json);
  return items.map((item) => ({
    lawId: pick(item, ["법령ID", "법령일련번호", "MST", "ID", "lawId"]),
    lawName: pick(item, ["법령명한글", "법령명", "lawName"]) ?? query,
    raw: item,
  }));
}

export async function fetchLawDetail(
  oc: string,
  lawId: string,
  baseUrl: string,
): Promise<MolegLawDetail> {
  const url =
    `${baseUrl}/lawService.do?OC=${encodeURIComponent(oc)}` +
    `&target=law&type=JSON&ID=${encodeURIComponent(lawId)}`;
  const json = await fetchJson(url);

  const articles: MolegArticle[] = [];
  const articleItems = findResultArray(
    (json as Record<string, unknown>)?.["조문"] ?? json,
  );
  for (const a of articleItems) {
    const content = pick(a, ["조문내용", "content", "내용"]);
    if (content) {
      articles.push({
        articleNo: pick(a, ["조문번호", "조문키", "articleNo"]),
        content,
      });
    }
  }

  const lawName =
    pick((json as Record<string, unknown>) ?? {}, ["법령명한글", "법령명"]) ?? lawId;

  return {
    lawId,
    lawName,
    articles,
    sourceUrl: url,
    raw: json,
  };
}
