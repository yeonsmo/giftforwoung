import { requireUser } from "@/lib/auth/session";
import { AnalysisRunner } from "@/components/ai/AnalysisRunner";

export const dynamic = "force-dynamic";

export default async function DebatePage() {
  await requireUser();
  return (
    <AnalysisRunner
      heading="다중 모델 교차 검증"
      description="AI 키가 2개 이상 등록되어 있으면 분석이 Cross-Examination(교차 검증) 방식의 토론 오케스트레이션으로 자동 확장됩니다. 1차 판별, 다른 모델의 비평, 비평을 반영한 최종 재판별 결과를 함께 표시합니다. 키가 1개이면 단일 모델로 동작합니다."
    />
  );
}
