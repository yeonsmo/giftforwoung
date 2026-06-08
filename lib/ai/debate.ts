import "server-only";
import { listActiveKeys } from "@/lib/ai/keys-store";
import { callModel } from "@/lib/ai/providers";
import type { InlineMedia } from "@/lib/ai/gemini";
import { buildLegislationContext } from "@/lib/legislation/context";
import {
  JUDGE_SYSTEM,
  CRITIQUE_SYSTEM,
  buildJudgePrompt,
  buildCritiquePrompt,
  buildFinalPrompt,
  parseVerdict,
  parseCritique,
  type AnalysisVerdict,
  type Participant,
} from "@/lib/ai/verdict";

/**
 * Multi-model debate orchestration via Cross-Examination (spec 4-3). Activated
 * automatically when 2+ AI keys are present. Each active key is a participant
 * model, so adding keys expands the panel dynamically.
 *
 *   Stage 1: the lead model performs the initial judgment.
 *   Stage 2: every other model critiques the initial judgment.
 *   Stage 3: the lead model re-judges, incorporating the critiques, to reach
 *            the final consensus verdict.
 */

export interface DebateCritique extends Participant {
  agree: boolean;
  critique: string;
}

export interface DebateResult {
  mode: "debate";
  verdict: AnalysisVerdict;
  debate: {
    participants: Participant[];
    initial: Participant & { verdict: AnalysisVerdict };
    critiques: DebateCritique[];
    final: Participant;
  };
}

export async function runDebateAnalysis(input: {
  media?: InlineMedia;
  contentText?: string;
  note?: string;
}): Promise<DebateResult> {
  const keys = await listActiveKeys();
  if (keys.length < 2) {
    throw new Error("토론 오케스트레이션에는 2개 이상의 AI 키가 필요합니다.");
  }
  const legislation = await buildLegislationContext();
  const lead = keys[0]!;

  // Stage 1: initial judgment by the lead model.
  const initialText = await callModel(lead.provider, lead.key, {
    systemInstruction: JUDGE_SYSTEM,
    prompt: buildJudgePrompt(legislation, input.note, input.contentText),
    media: input.media,
  });
  const initialVerdict = parseVerdict(initialText);

  // Stage 2: each remaining model critiques the initial judgment.
  const critiques: DebateCritique[] = [];
  for (const k of keys.slice(1)) {
    const critiqueText = await callModel(k.provider, k.key, {
      systemInstruction: CRITIQUE_SYSTEM,
      prompt: buildCritiquePrompt(legislation, initialVerdict, input.note, input.contentText),
      media: input.media,
    });
    const parsed = parseCritique(critiqueText);
    critiques.push({
      provider: k.provider,
      label: k.label,
      agree: parsed.agree,
      critique: parsed.critique,
    });
  }

  // Stage 3: the lead model re-judges, incorporating the critiques.
  const finalText = await callModel(lead.provider, lead.key, {
    systemInstruction: JUDGE_SYSTEM,
    prompt: buildFinalPrompt(
      legislation,
      initialVerdict,
      critiques.map((c) => ({
        provider: c.provider,
        agree: c.agree,
        critique: c.critique,
      })),
      input.note,
      input.contentText,
    ),
    media: input.media,
  });
  const finalVerdict = parseVerdict(finalText);

  return {
    mode: "debate",
    verdict: finalVerdict,
    debate: {
      participants: keys.map((k) => ({ provider: k.provider, label: k.label })),
      initial: { provider: lead.provider, label: lead.label, verdict: initialVerdict },
      critiques,
      final: { provider: lead.provider, label: lead.label },
    },
  };
}
