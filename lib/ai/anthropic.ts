import "server-only";
import { serverEnv } from "@/lib/env";
import type { InlineMedia } from "@/lib/ai/gemini";

/**
 * Anthropic (Claude) adapter using the Messages REST API (POST /v1/messages).
 * Supports text plus inline base64 image input. Claude vision accepts images
 * (jpeg/png/gif/webp), not video, so callers pass only image media here.
 *
 * Note: current Claude models (Opus 4.x) reject temperature/top_p/top_k and
 * budget_tokens, so none are sent. Model and version are configurable via env.
 */

export interface AnthropicCallInput {
  apiKey: string;
  model?: string;
  systemInstruction: string;
  prompt: string;
  media?: InlineMedia;
  /** Accepted for interface parity; Claude output is shaped by the prompt. */
  json?: boolean;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  error?: { message?: string };
}

export async function anthropicGenerate(
  input: AnthropicCallInput,
): Promise<string> {
  const model = input.model ?? serverEnv().AI_ANTHROPIC_MODEL;
  const baseUrl = serverEnv().AI_ANTHROPIC_BASE_URL;
  const version = serverEnv().AI_ANTHROPIC_VERSION;

  const userContent: Record<string, unknown>[] = [
    { type: "text", text: input.prompt },
  ];
  if (input.media) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.media.mimeType,
        data: input.media.base64,
      },
    });
  }

  const body = {
    model,
    max_tokens: serverEnv().AI_MAX_OUTPUT_TOKENS,
    system: input.systemInstruction,
    messages: [{ role: "user", content: userContent }],
  };

  const res = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": input.apiKey,
      "anthropic-version": version,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as AnthropicResponse;
  if (!res.ok) {
    throw new Error(
      `Anthropic 요청 실패 (HTTP ${res.status}): ${json.error?.message ?? "알 수 없는 오류"}`,
    );
  }
  const text = (json.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Anthropic 응답에서 텍스트를 찾지 못했습니다.");
  return text;
}
