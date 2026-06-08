import "server-only";
import { runAnalysis, type AnalysisResult } from "@/lib/ai/analysis";
import type { InlineMedia } from "@/lib/ai/gemini";

/**
 * Cyclic workflow re-verification (spec 6-3): takes a stored generation result
 * and runs it back through the analysis engine (single model or debate). This
 * closes the loop 생성 -> 다운로드 -> 재검증 -> 결과 표시 (spec 6-4).
 */

export interface StoredGenerationResult {
  outputType: string;
  text?: string;
  imageDataUrl?: string;
}

function parseDataUrl(dataUrl: string): InlineMedia | null {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match || !match[1] || match[2] === undefined) return null;
  return { mimeType: match[1], base64: match[2] };
}

async function imageToMedia(imageRef: string): Promise<InlineMedia> {
  const data = parseDataUrl(imageRef);
  if (data) return data;
  const res = await fetch(imageRef);
  if (!res.ok) {
    throw new Error(`생성 이미지 다운로드 실패 (HTTP ${res.status})`);
  }
  const mimeType = res.headers.get("content-type") ?? "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType, base64: buf.toString("base64") };
}

export async function reverifyGeneration(
  result: StoredGenerationResult,
): Promise<AnalysisResult> {
  switch (result.outputType) {
    case "copywriting":
      if (!result.text) throw new Error("재검증할 카피 텍스트가 없습니다.");
      return runAnalysis({ contentText: result.text });
    case "image":
      if (!result.imageDataUrl) throw new Error("재검증할 이미지가 없습니다.");
      return runAnalysis({ media: await imageToMedia(result.imageDataUrl) });
    case "video":
      throw new Error(
        "영상은 완성된 자산이 있어야 재검증할 수 있습니다. 영상 생성은 비동기로 처리됩니다.",
      );
    default:
      throw new Error(`재검증할 수 없는 출력 유형입니다: ${result.outputType}`);
  }
}
