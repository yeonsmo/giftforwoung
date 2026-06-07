import "server-only";
import { serverEnv } from "@/lib/env";
import type { InlineMedia } from "@/lib/ai/gemini";

/**
 * OpenAI (GPT) adapter using the Chat Completions REST API. Supports text plus
 * inline image input (image_url data URL). OpenAI vision does not accept video,
 * so callers pass only image media here (see lib/ai/providers.ts).
 */

export interface OpenAiCallInput {
  apiKey: string;
  model?: string;
  systemInstruction: string;
  prompt: string;
  media?: InlineMedia;
  /** When false, requests free text instead of JSON output. Default true. */
  json?: boolean;
}

interface OpenAiResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export async function openaiGenerate(input: OpenAiCallInput): Promise<string> {
  const model = input.model ?? serverEnv().AI_OPENAI_MODEL;
  const baseUrl = serverEnv().AI_OPENAI_BASE_URL;

  const userContent: Record<string, unknown>[] = [
    { type: "text", text: input.prompt },
  ];
  if (input.media) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${input.media.mimeType};base64,${input.media.base64}`,
      },
    });
  }

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: input.systemInstruction },
      { role: "user", content: userContent },
    ],
    max_tokens: serverEnv().AI_MAX_OUTPUT_TOKENS,
  };
  if (input.json !== false) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as OpenAiResponse;
  if (!res.ok) {
    throw new Error(
      `OpenAI 요청 실패 (HTTP ${res.status}): ${json.error?.message ?? "알 수 없는 오류"}`,
    );
  }
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI 응답에서 텍스트를 찾지 못했습니다.");
  return text;
}
