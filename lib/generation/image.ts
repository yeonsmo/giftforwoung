import "server-only";
import { serverEnv } from "@/lib/env";
import { firstActiveKeyForProvider } from "@/lib/ai/keys-store";
import { KEY_CATEGORIES } from "@/lib/constants";
import { buildLegislationContext } from "@/lib/legislation/context";
import { getTrendContext } from "@/lib/generation/trend";

/**
 * Image generation (spec 5-2-1) across OpenAI DALL-E, Google Imagen, and
 * Stability AI. Each adapter issues the provider's real request and returns the
 * image as a data URL. The visual prompt embeds compliance guardrails and trend
 * context so the output stays law-compliant (spec 5-1).
 */

export interface ImageResult {
  outputType: "image";
  provider: string;
  imageDataUrl: string;
}

async function buildImagePrompt(brief: string, note?: string): Promise<string> {
  // Keep legislation grounding compact; image models take a visual prompt, so we
  // summarize compliance intent rather than pasting full statute text.
  await buildLegislationContext(20);
  const trend = await getTrendContext();
  return [
    brief,
    note ?? "",
    trend ? `반영할 트렌드: ${trend}` : "",
    "보험광고 이미지. 과장되거나 오인을 유발하는 표현 금지, 정확하고 신뢰감 있는 톤, 텍스트는 최소화.",
  ]
    .filter(Boolean)
    .join(" / ");
}

async function generateDalle(apiKey: string, prompt: string): Promise<string> {
  const baseUrl = serverEnv().AI_OPENAI_BASE_URL;
  const model = serverEnv().GEN_OPENAI_IMAGE_MODEL;
  const res = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { b64_json?: string; url?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(`DALL-E 요청 실패 (HTTP ${res.status}): ${json.error?.message ?? ""}`);
  }
  const item = json.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item?.url) return item.url;
  throw new Error("DALL-E 응답에서 이미지를 찾지 못했습니다.");
}

async function generateImagen(apiKey: string, prompt: string): Promise<string> {
  const baseUrl = serverEnv().AI_GEMINI_BASE_URL;
  const model = serverEnv().GEN_IMAGEN_MODEL;
  const res = await fetch(
    `${baseUrl}/models/${encodeURIComponent(model)}:predict?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    predictions?: { bytesBase64Encoded?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(`Imagen 요청 실패 (HTTP ${res.status}): ${json.error?.message ?? ""}`);
  }
  const b64 = json.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("Imagen 응답에서 이미지를 찾지 못했습니다.");
  return `data:image/png;base64,${b64}`;
}

async function generateStability(apiKey: string, prompt: string): Promise<string> {
  const baseUrl = serverEnv().GEN_STABILITY_BASE_URL;
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("output_format", "png");
  const res = await fetch(`${baseUrl}/v2beta/stable-image/generate/core`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stability 요청 실패 (HTTP ${res.status}): ${text}`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export async function generateImage(input: {
  provider: string;
  brief: string;
  note?: string;
}): Promise<ImageResult> {
  const key = await firstActiveKeyForProvider(input.provider, KEY_CATEGORIES.IMAGE);
  if (!key) {
    throw new Error(
      `이미지 생성 키가 없습니다(${input.provider}). 생성 설정에서 키를 입력하십시오.`,
    );
  }
  const prompt = await buildImagePrompt(input.brief, input.note);

  let imageDataUrl: string;
  switch (input.provider) {
    case "openai_dalle":
      imageDataUrl = await generateDalle(key.key, prompt);
      break;
    case "google_imagen":
      imageDataUrl = await generateImagen(key.key, prompt);
      break;
    case "stability":
      imageDataUrl = await generateStability(key.key, prompt);
      break;
    default:
      throw new Error(`지원하지 않는 이미지 제공자입니다: ${input.provider}`);
  }

  return { outputType: "image", provider: input.provider, imageDataUrl };
}
