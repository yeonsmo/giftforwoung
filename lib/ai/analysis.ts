import "server-only";
import { serverEnv } from "@/lib/env";
import {
  listActiveKeys,
  activeKeyCount,
  type AiKeyWithSecret,
} from "@/lib/ai/keys-store";
import { callModel } from "@/lib/ai/providers";
import type { InlineMedia } from "@/lib/ai/gemini";
import { buildLegislationContext } from "@/lib/legislation/context";
import {
  JUDGE_SYSTEM,
  buildJudgePrompt,
  parseVerdict,
  type AnalysisVerdict,
  type Participant,
} from "@/lib/ai/verdict";
import { runDebateAnalysis, type DebateResult } from "@/lib/ai/debate";

/**
 * Analysis engine entry point. With one active AI key it runs a single model
 * (spec 4-2); with two or more it expands automatically to the multi-model
 * cross-examination debate (spec 4-3). The threshold is AI_DEBATE_MIN_KEYS.
 */

export interface SingleModelResult {
  mode: "single";
  provider: string;
  label: string | null;
  verdict: AnalysisVerdict;
  rawText: string;
}

export type AnalysisResult = SingleModelResult | DebateResult;

export interface AnalysisInput {
  media: InlineMedia;
  note?: string;
}

export async function runAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  const count = await activeKeyCount();
  if (count === 0) {
    throw new Error(
      "AI API 키가 설정되어 있지 않습니다. 설정 메뉴에서 키를 입력하십시오.",
    );
  }
  if (count >= serverEnv().AI_DEBATE_MIN_KEYS) {
    return runDebateAnalysis(input);
  }
  return runSingleModelAnalysis(input);
}

export async function runSingleModelAnalysis(
  input: AnalysisInput,
): Promise<SingleModelResult> {
  const keys = await listActiveKeys();
  if (keys.length === 0) {
    throw new Error(
      "AI API 키가 설정되어 있지 않습니다. 설정 메뉴에서 키를 입력하십시오.",
    );
  }
  const key: AiKeyWithSecret = keys[0]!;
  const legislation = await buildLegislationContext();

  const rawText = await callModel(key.provider, key.key, {
    systemInstruction: JUDGE_SYSTEM,
    prompt: buildJudgePrompt(legislation, input.note),
    media: input.media,
  });

  return {
    mode: "single",
    provider: key.provider,
    label: key.label,
    verdict: parseVerdict(rawText),
    rawText,
  };
}

export type { Participant };
