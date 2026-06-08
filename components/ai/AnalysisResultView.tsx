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

interface Participant {
  provider: string;
  label: string | null;
}

interface DebateCritique extends Participant {
  agree: boolean;
  critique: string;
}

export interface AnalysisResult {
  mode: "single" | "debate";
  provider?: string;
  label?: string | null;
  verdict: AnalysisVerdict;
  rawText?: string;
  debate?: {
    participants: Participant[];
    initial: Participant & { verdict: AnalysisVerdict };
    critiques: DebateCritique[];
    final: Participant;
  };
}

function name(p: Participant): string {
  return p.label ? `${p.provider} (${p.label})` : p.provider;
}

function Basis({ basis }: { basis: ViolationBasis[] }) {
  if (basis.length === 0) {
    return <p className="text-xs text-[var(--color-muted)]">제시된 근거 조항이 없습니다.</p>;
  }
  return (
    <ul className="space-y-2">
      {basis.map((b, i) => (
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
  );
}

/**
 * Renders an analysis verdict per spec 9-3: violation status, basis articles,
 * confidence, and participating model opinion(s). For debate results it also
 * shows each model's opinion, the critiques, and the final consensus (spec 4-3-4).
 * Reused by the analysis page and the cyclic re-verification workflow (Step 7).
 */
export function AnalysisResultView({ result }: { result: AnalysisResult }) {
  const { verdict, debate } = result;
  return (
    <div className="space-y-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-[var(--color-muted)]">최종 판별</span>
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
          판별 방식: {result.mode === "single" ? "단일 모델" : "다중 모델 토론(교차 검증)"}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-[var(--color-muted)]">근거 법령 조항</p>
        <Basis basis={verdict.basis} />
      </div>

      <div className="space-y-1">
        <p className="text-xs text-[var(--color-muted)]">
          최종 합의 의견
          {result.mode === "single" && result.label ? ` (${result.label})` : ""}
        </p>
        <p className="whitespace-pre-wrap text-sm">{verdict.opinion}</p>
      </div>

      {debate ? (
        <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted)]">
            참여 모델: {debate.participants.map(name).join(", ")}
          </p>

          <div className="space-y-2">
            <p className="text-xs font-medium">1차 판별 ({name(debate.initial)})</p>
            <p className="text-xs">
              {debate.initial.verdict.violation ? "위반" : "위반하지 않음"} · 신뢰도{" "}
              {(debate.initial.verdict.confidence * 100).toFixed(0)}%
            </p>
            <p className="whitespace-pre-wrap text-xs text-[var(--color-muted)]">
              {debate.initial.verdict.opinion}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium">비평</p>
            {debate.critiques.map((c, i) => (
              <div
                key={i}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-2"
              >
                <p className="text-xs">
                  {name(c)} · {c.agree ? "동의" : "이견"}
                </p>
                <p className="whitespace-pre-wrap text-xs text-[var(--color-muted)]">
                  {c.critique}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-[var(--color-muted)]">
            최종 재판별: {name(debate.final)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
