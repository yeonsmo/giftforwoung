import "server-only";
import type { InlineMedia } from "@/lib/ai/gemini";
import { generateCopy, type CopyResult } from "@/lib/generation/copywriting";
import { generateImage, type ImageResult } from "@/lib/generation/image";
import { generateVideo, type VideoResult } from "@/lib/generation/video";
import { GENERATION_OUTPUT_TYPES } from "@/lib/constants";

export type GenerationResult = CopyResult | ImageResult | VideoResult;

/**
 * Generation orchestrator (spec 5). Dispatches to the copywriting, image, or
 * video generator. Each path grounds output in the legislation DB and reflects
 * marketing trends. The generated content is returned for download and can be
 * re-verified through the analysis engine (Step 7).
 */
export async function runGeneration(input: {
  outputType: string;
  provider?: string;
  brief: string;
  media?: InlineMedia;
  note?: string;
}): Promise<GenerationResult> {
  switch (input.outputType) {
    case GENERATION_OUTPUT_TYPES.COPYWRITING:
      return generateCopy({ brief: input.brief, media: input.media, note: input.note });
    case GENERATION_OUTPUT_TYPES.IMAGE:
      if (!input.provider) throw new Error("이미지 제공자를 선택하십시오.");
      return generateImage({ provider: input.provider, brief: input.brief, note: input.note });
    case GENERATION_OUTPUT_TYPES.VIDEO:
      if (!input.provider) throw new Error("영상 제공자를 선택하십시오.");
      return generateVideo({ provider: input.provider, brief: input.brief, note: input.note });
    default:
      throw new Error(`지원하지 않는 출력 유형입니다: ${input.outputType}`);
  }
}
