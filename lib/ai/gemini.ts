import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * Gemini (Vision LLM) adapter using the Generative Language REST API. Supports
 * multimodal input: a text instruction plus inline media (image or video).
 *
 * Inline data is limited by the request size (~20MB). Larger media should use
 * the Gemini Files API; that extension can be added without changing callers.
 */

export interface InlineMedia {
  base64: string;
  mimeType: string;
}

export interface GeminiCallInput {
  apiKey: string;
  model?: string;
  systemInstruction: string;
  prompt: string;
  media?: InlineMedia;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

export async function geminiGenerate(input: GeminiCallInput): Promise<string> {
  const model = input.model ?? serverEnv().AI_GEMINI_MODEL;
  const baseUrl = serverEnv().AI_GEMINI_BASE_URL;
  const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

  const parts: Record<string, unknown>[] = [{ text: input.prompt }];
  if (input.media) {
    parts.push({
      inline_data: { mime_type: input.media.mimeType, data: input.media.base64 },
    });
  }

  const body = {
    system_instruction: { parts: [{ text: input.systemInstruction }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.2, response_mime_type: "application/json" },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (!res.ok) {
    throw new Error(
      `Gemini 요청 실패 (HTTP ${res.status}): ${json.error?.message ?? "알 수 없는 오류"}`,
    );
  }
  const text = json.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini 응답에서 텍스트를 찾지 못했습니다.");
  return text;
}
