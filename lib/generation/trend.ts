import "server-only";
import { getTrendConfig, getTrendApiKey } from "@/lib/generation/trend-config";

/**
 * Fetches marketing-trend context from the configured external API (spec 5-3).
 * Returns null when no endpoint is configured, in which case generation falls
 * back to the LLM's intrinsic trend knowledge (spec 5-3-1).
 *
 * The parsing rule is a dot-path (e.g. "data.trends" or "results.0.title") used
 * to extract a string or array from the JSON response, keeping the integration
 * generic across arbitrary trend APIs.
 */
export async function getTrendContext(): Promise<string | null> {
  const config = await getTrendConfig();
  if (!config.endpoint) return null;

  const key = await getTrendApiKey();
  const res = await fetch(config.endpoint, {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
  });
  if (!res.ok) {
    throw new Error(`트렌드 API 요청 실패 (HTTP ${res.status})`);
  }
  const json = (await res.json().catch(() => null)) as unknown;
  if (json === null) {
    throw new Error("트렌드 API 응답을 JSON으로 해석하지 못했습니다.");
  }

  const extracted = config.parsing ? extractByPath(json, config.parsing) : json;
  return formatTrend(extracted);
}

function extractByPath(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const segment of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(segment);
      current = Number.isInteger(idx) ? current[idx] : undefined;
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

function formatTrend(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join(", ");
  }
  return JSON.stringify(value);
}
