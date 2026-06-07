"use client";

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

export interface AnalysisResult {
  mode: "single" | "debate";
  provider?: string;
  label?: string | null;
  verdict: AnalysisVerdict;
  rawText?: string;
}

/**
 * Renders an analysis verdict per spec 9-3: violation status, basis articles,
 * confidence, and the participating model opinion. Reused by the analysis page
 * and the cyclic re-verification workflow (Step 7).
 */
export function AnalysisResultView({ result }: { result: AnalysisResult }) {
  const { verdict } = result;
  return (
    <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--color-muted)]">위반 여부</span>
        <span
          className={
            verdict.violation ? "font-semibold text-red-400" : "font-semibold text-green-400"
          }
        >
          {verdict.violation ? "위반" : "위반하지 않음"}
        </span>
        <span className="text-xs text-[var(--color-muted)]">
          신뢰도 {(verdict.confidence * 100).toFixed(0)}%
        </span>
        <span className="text-xs text-[var(--color-muted)]">
          판별 방식: {result.mode === "single" ? "단일 모델" : "다중 모델 토론"}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-[var(--color-muted)]">근거 법령 조항</p>
        {verdict.basis.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)]">제시된 근거 조항이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {verdict.basis.map((b, i) => (
              <li
                key={i}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-2"
              >
                <p className="font-medium">
                  {b.law} {b.article}
                </p>
                <p className="text-xs text-[var(--color-muted)]">{b.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-[var(--color-muted)]">
          참여 모델 의견{result.label ? ` (${result.label})` : ""}
        </p>
        <p className="whitespace-pre-wrap text-sm">{verdict.opinion}</p>
      </div>
    </div>
  );
}
