/**
 * Shared verdict types, parsing, and prompts for the analysis engine. Used by
 * both the single-model path (lib/ai/analysis.ts) and the multi-model debate
 * path (lib/ai/debate.ts).
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

export interface Participant {
  provider: string;
  label: string | null;
}

export interface CritiqueResult {
  agree: boolean;
  critique: string;
}

export const JUDGE_SYSTEM = [
  "당신은 한국 보험광고의 법령 위반 여부를 판별하는 전문가입니다.",
  "제공된 법령 데이터에만 근거하여 업로드된 콘텐츠(이미지 또는 영상)를 분석하십시오.",
  "출력에 이모지를 절대 사용하지 마십시오.",
  "반드시 다음 JSON 스키마로만 응답하십시오. 다른 텍스트를 포함하지 마십시오.",
  '{"violation": boolean, "confidence": number(0~1), "basis": [{"law": string, "article": string, "reason": string}], "opinion": string}',
  "위반 근거가 없으면 violation은 false, basis는 빈 배열로 두십시오.",
].join("\n");

export const CRITIQUE_SYSTEM = [
  "당신은 다른 모델의 보험광고 법령 위반 1차 판별을 검증하는 전문가입니다.",
  "1차 판별의 논리와 근거 법령을 비평하고, 동의 여부와 반론 또는 보강 의견을 제시하십시오.",
  "출력에 이모지를 절대 사용하지 마십시오.",
  "반드시 다음 JSON 스키마로만 응답하십시오. 다른 텍스트를 포함하지 마십시오.",
  '{"agree": boolean, "critique": string}',
].join("\n");

/** Extracts the first JSON object from a model response and coerces a verdict. */
export function parseVerdict(text: string): AnalysisVerdict {
  const obj = extractJson(text);
  return {
    violation: Boolean(obj.violation),
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0,
    basis: Array.isArray(obj.basis) ? (obj.basis as ViolationBasis[]) : [],
    opinion: typeof obj.opinion === "string" ? obj.opinion : "",
  };
}

export function parseCritique(text: string): CritiqueResult {
  const obj = extractJson(text);
  return {
    agree: Boolean(obj.agree),
    critique: typeof obj.critique === "string" ? obj.critique : "",
  };
}

function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("모델 응답에서 JSON 결과를 찾지 못했습니다.");
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

function contentSection(contentText?: string): string {
  return contentText ? `검토 대상 콘텐츠(텍스트):\n${contentText}` : "";
}

const TARGET_NOTE =
  "판별 대상은 첨부된 미디어 또는 위에 제시된 텍스트 콘텐츠입니다.";

export function buildJudgePrompt(
  legislation: string,
  note?: string,
  contentText?: string,
): string {
  return [
    "다음은 대조에 사용할 수집된 법령 데이터입니다:",
    legislation,
    "",
    contentSection(contentText),
    "",
    note ? `추가 참고 사항: ${note}` : "",
    "",
    `위 법령에 근거하여 보험광고 콘텐츠의 위반 여부를 판별하고 지정된 JSON으로만 응답하십시오. ${TARGET_NOTE}`,
  ].join("\n");
}

export function buildCritiquePrompt(
  legislation: string,
  initial: AnalysisVerdict,
  note?: string,
  contentText?: string,
): string {
  return [
    "다음은 대조에 사용할 수집된 법령 데이터입니다:",
    legislation,
    "",
    contentSection(contentText),
    "",
    "다음은 다른 모델의 1차 판별 결과입니다:",
    JSON.stringify(initial),
    "",
    note ? `추가 참고 사항: ${note}` : "",
    "",
    "이 1차 판별을 비평하고 지정된 JSON으로만 응답하십시오.",
  ].join("\n");
}

export function buildFinalPrompt(
  legislation: string,
  initial: AnalysisVerdict,
  critiques: { provider: string; agree: boolean; critique: string }[],
  note?: string,
  contentText?: string,
): string {
  return [
    "다음은 대조에 사용할 수집된 법령 데이터입니다:",
    legislation,
    "",
    contentSection(contentText),
    "",
    "다음은 1차 판별 결과입니다:",
    JSON.stringify(initial),
    "",
    "다음은 다른 모델들의 비평입니다:",
    JSON.stringify(critiques),
    "",
    note ? `추가 참고 사항: ${note}` : "",
    "",
    `비평을 반영하여 최종 판별을 다시 수행하고 지정된 JSON으로만 응답하십시오. ${TARGET_NOTE}`,
  ].join("\n");
}
