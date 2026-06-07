import "server-only";
import { geminiGenerate, type InlineMedia } from "@/lib/ai/gemini";
import { openaiGenerate } from "@/lib/ai/openai";
import { anthropicGenerate } from "@/lib/ai/anthropic";

/**
 * Uniform dispatch across AI providers. Each active key is a participant model;
 * this wraps the provider-specific adapters behind one call signature so the
 * single-model and debate engines stay provider-agnostic.
 */

export interface ModelCallInput {
  systemInstruction: string;
  prompt: string;
  media?: InlineMedia;
}

/** Gemini handles image and video; OpenAI/Anthropic handle images only. */
export function providerSupportsMedia(provider: string, mimeType: string): boolean {
  if (provider === "gemini") return true;
  return mimeType.startsWith("image/");
}

export async function callModel(
  provider: string,
  apiKey: string,
  input: ModelCallInput,
): Promise<string> {
  const media =
    input.media && providerSupportsMedia(provider, input.media.mimeType)
      ? input.media
      : undefined;

  // When media is dropped because the provider cannot view it (e.g. video on a
  // non-Gemini model), tell the model so it reasons from the prior analysis.
  const prompt =
    !media && input.media
      ? `${input.prompt}\n\n참고: 이 모델은 첨부된 미디어 형식(영상 등)을 직접 분석할 수 없으므로, 다른 모델의 판별과 법령 근거를 토대로 검토하십시오.`
      : input.prompt;

  const call = { apiKey, systemInstruction: input.systemInstruction, prompt, media };

  switch (provider) {
    case "gemini":
      return geminiGenerate(call);
    case "openai":
      return openaiGenerate(call);
    case "anthropic":
      return anthropicGenerate(call);
    default:
      throw new Error(`지원하지 않는 제공자입니다: ${provider}`);
  }
}
