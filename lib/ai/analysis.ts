import "server-only";
import { listActiveKeys, type AiKeyWithSecret } from "@/lib/ai/keys-store";
import { geminiGenerate, type InlineMedia } from "@/lib/ai/gemini";
import { buildLegislationContext } from "@/lib/legislation/context";

/**
 * Single-model analysis engine (spec 4-2). A Vision LLM (Gemini by default)
 * analyzes the uploaded media and compares it against the collected legislation
 * to judge whether it violates the law. Multi-model debate (2+ keys) is Step 5.
 */

export interface ViolationBasis {
  law: string;
  article: string;
  reason: string;
}

export interface AnalysisVerdict {
  violation: boolean;
  confidence: number;
  basis: ViolationBasis[];
  opinion: string;
}

export interface SingleModelResult {
  mode: "single";
  provider: string;
  label: string | null;
  verdict: AnalysisVerdict;
  rawText: string;
}

const SYSTEM_INSTRUCTION = [
  "당신은 한국 보험광고의 법령 위반 여부를 판별하는 전문가입니다.",
  "제공된 법령 데이터에만 근거하여 업로드된 콘텐츠(이미지 또는 영상)를 분석하십시오.",
  "출력에 이모지를 절대 사용하지 마십시오.",
  "반드시 다음 JSON 스키마로만 응답하십시오. 다른 텍스트를 포함하지 마십시오.",
  '{"violation": boolean, "confidence": number(0~1), "basis": [{"law": string, "article": string, "reason": string}], "opinion": string}',
  "위반 근거가 없으면 violation은 false, basis는 빈 배열로 두십시오.",
].join("\n");

/** Selects the Gemini key to drive the single-model analysis. */
function selectGeminiKey(keys: AiKeyWithSecret[]): AiKeyWithSecret | null {
  return keys.find((k) => k.provider === "gemini") ?? null;
}

/** Extracts the first JSON object from a model response. */
function parseVerdict(text: string): AnalysisVerdict {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("모델 응답에서 JSON 결과를 찾지 못했습니다.");
  }
  const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<AnalysisVerdict>;
  return {
    violation: Boolean(parsed.violation),
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    basis: Array.isArray(parsed.basis) ? parsed.basis : [],
    opinion: typeof parsed.opinion === "string" ? parsed.opinion : "",
  };
}

export async function runSingleModelAnalysis(input: {
  media: InlineMedia;
  note?: string;
}): Promise<SingleModelResult> {
  const keys = await listActiveKeys();
  if (keys.length === 0) {
    throw new Error(
      "AI API 키가 설정되어 있지 않습니다. 설정 메뉴에서 Gemini 키를 입력하십시오.",
    );
  }
  const geminiKey = selectGeminiKey(keys);
  if (!geminiKey) {
    throw new Error(
      "단일 모델 분석에는 Gemini 키가 필요합니다. 설정 메뉴에서 Gemini 키를 추가하십시오.",
    );
  }

  const legislation = await buildLegislationContext();
  const prompt = [
    "다음은 대조에 사용할 수집된 법령 데이터입니다:",
    legislation,
    "",
    input.note ? `추가 참고 사항: ${input.note}` : "",
    "",
    "위 법령에 근거하여 첨부된 보험광고 콘텐츠의 위반 여부를 판별하고 지정된 JSON으로만 응답하십시오.",
  ].join("\n");

  const rawText = await geminiGenerate({
    apiKey: geminiKey.key,
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
    media: input.media,
  });

  return {
    mode: "single",
    provider: geminiKey.provider,
    label: geminiKey.label,
    verdict: parseVerdict(rawText),
    rawText,
  };
}
