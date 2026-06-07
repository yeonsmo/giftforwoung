import "server-only";
import { serverEnv } from "@/lib/env";
import { firstActiveKeyForProvider } from "@/lib/ai/keys-store";
import { KEY_CATEGORIES } from "@/lib/constants";
import { getTrendContext } from "@/lib/generation/trend";

/**
 * Video generation (spec 5-2-3) across Runway, Pika, and Google Veo. These APIs
 * are asynchronous: a generation is submitted and produces a job that is polled
 * for completion. Each adapter here issues the real submission request and
 * returns the provider's job reference. Polling/retrieval of the finished asset
 * is a follow-up step that can be added without changing callers; the submission
 * path is implemented in full.
 */

export interface VideoResult {
  outputType: "video";
  provider: string;
  status: string;
  reference: string | null;
  raw: unknown;
}

async function buildVideoPrompt(brief: string, note?: string): Promise<string> {
  const trend = await getTrendContext();
  return [
    brief,
    note ?? "",
    trend ? `반영할 트렌드: ${trend}` : "",
    "보험광고 영상. 과장·오인 표현 금지, 정확하고 신뢰감 있는 톤.",
  ]
    .filter(Boolean)
    .join(" / ");
}

async function submitRunway(apiKey: string, prompt: string): Promise<VideoResult> {
  const baseUrl = serverEnv().GEN_RUNWAY_BASE_URL;
  const res = await fetch(`${baseUrl}/v1/text_to_video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify({ promptText: prompt, model: "gen3a_turbo" }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  if (!res.ok) {
    throw new Error(`Runway 요청 실패 (HTTP ${res.status})`);
  }
  return {
    outputType: "video",
    provider: "runway",
    status: "submitted",
    reference: json.id ?? null,
    raw: json,
  };
}

async function submitPika(apiKey: string, prompt: string): Promise<VideoResult> {
  const baseUrl = serverEnv().GEN_PIKA_BASE_URL;
  const res = await fetch(`${baseUrl}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; job_id?: string };
  if (!res.ok) {
    throw new Error(`Pika 요청 실패 (HTTP ${res.status})`);
  }
  return {
    outputType: "video",
    provider: "pika",
    status: "submitted",
    reference: json.id ?? json.job_id ?? null,
    raw: json,
  };
}

async function submitVeo(apiKey: string, prompt: string): Promise<VideoResult> {
  const baseUrl = serverEnv().AI_GEMINI_BASE_URL;
  const res = await fetch(
    `${baseUrl}/models/veo-3.0-generate-001:predictLongRunning?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instances: [{ prompt }] }),
    },
  );
  const json = (await res.json().catch(() => ({}))) as { name?: string };
  if (!res.ok) {
    throw new Error(`Veo 요청 실패 (HTTP ${res.status})`);
  }
  return {
    outputType: "video",
    provider: "google_veo",
    status: "submitted",
    reference: json.name ?? null,
    raw: json,
  };
}

export async function generateVideo(input: {
  provider: string;
  brief: string;
  note?: string;
}): Promise<VideoResult> {
  const key = await firstActiveKeyForProvider(input.provider, KEY_CATEGORIES.VIDEO);
  if (!key) {
    throw new Error(
      `영상 생성 키가 없습니다(${input.provider}). 생성 설정에서 키를 입력하십시오.`,
    );
  }
  const prompt = await buildVideoPrompt(input.brief, input.note);

  switch (input.provider) {
    case "runway":
      return submitRunway(key.key, prompt);
    case "pika":
      return submitPika(key.key, prompt);
    case "google_veo":
      return submitVeo(key.key, prompt);
    default:
      throw new Error(`지원하지 않는 영상 제공자입니다: ${input.provider}`);
  }
}
