import "server-only";
import { listActiveKeys } from "@/lib/ai/keys-store";
import { callModel } from "@/lib/ai/providers";
import type { InlineMedia } from "@/lib/ai/gemini";
import { KEY_CATEGORIES } from "@/lib/constants";
import { buildLegislationContext } from "@/lib/legislation/context";
import { getTrendContext } from "@/lib/generation/trend";

/**
 * Copywriting generation (spec 5-2-2). Uses an LLM key (gemini/openai/anthropic
 * from the AI keys settings) to produce law-compliant Korean insurance ad copy,
 * grounded in the collected legislation and reflecting marketing trends (spec
 * 5-1-2). Trends come from the external trend API when configured, otherwise
 * from the model's intrinsic knowledge (spec 5-3).
 */

const COPY_SYSTEM = [
  "당신은 한국 보험광고 카피라이터입니다.",
  "제공된 법령 데이터를 준수하는 것을 최우선으로, 과장·오인·불완전판매 소지가 없는 정확한 표현으로 마케팅 카피를 작성하십시오.",
  "마케팅 트렌드와 사람들의 선호도를 반영하되, 법령 준수를 절대 위반하지 마십시오.",
  "출력에 이모지를 사용하지 마십시오.",
  "결과는 바로 사용 가능한 카피 텍스트만 출력하십시오. 설명이나 머리말을 붙이지 마십시오.",
].join("\n");

export interface CopyResult {
  outputType: "copywriting";
  provider: string;
  text: string;
}

export async function generateCopy(input: {
  brief: string;
  media?: InlineMedia;
  note?: string;
}): Promise<CopyResult> {
  const keys = await listActiveKeys(KEY_CATEGORIES.LLM);
  if (keys.length === 0) {
    throw new Error(
      "카피라이팅에는 LLM 키(Gemini, OpenAI, Anthropic)가 필요합니다. AI 키 설정에서 추가하십시오.",
    );
  }
  const key = keys[0]!;
  const legislation = await buildLegislationContext();
  const trend = await getTrendContext();

  const prompt = [
    "다음 법령 데이터를 준수하여 보험광고 카피를 작성하십시오:",
    legislation,
    "",
    trend
      ? `참고할 외부 마케팅 트렌드 데이터: ${trend}`
      : "외부 트렌드 데이터가 없으므로 최신 마케팅 트렌드에 대한 내재 지식을 활용하십시오.",
    "",
    `생성 요청(브리프): ${input.brief}`,
    input.note ? `추가 참고 사항: ${input.note}` : "",
  ].join("\n");

  const text = await callModel(key.provider, key.key, {
    systemInstruction: COPY_SYSTEM,
    prompt,
    media: input.media,
    json: false,
  });

  return { outputType: "copywriting", provider: key.provider, text };
}
