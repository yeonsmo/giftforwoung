"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AnalysisResultView,
  type AnalysisResult,
} from "@/components/ai/AnalysisResultView";

interface Generation {
  id: string;
  output_type: string;
  provider: string | null;
  brief: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  copywriting: "카피라이팅",
  image: "이미지",
  video: "영상",
};

export function WorkflowRunner() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/workflow/generations")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("목록 조회 실패"))))
      .then((d: { generations: Generation[] }) => setGenerations(d.generations))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function reverify(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/workflow/reverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: id }),
      });
      const data = (await res.json().catch(() => ({}))) as AnalysisResult & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `요청 실패 (HTTP ${res.status})`);
      setResults((prev) => ({ ...prev, [id]: data }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">생성 후 재검증 (순환 워크플로우)</h1>
      <p className="text-xs text-[var(--color-muted)]">
        생성된 콘텐츠를 분석 엔진(단일 모델 또는 다중 모델 토론)으로 다시 검증합니다. 생성 콘텐츠의 위반 여부 판별은 사용자의 책임과 몫입니다. 영상은 완성된 자산이 있어야 재검증할 수 있습니다.
      </p>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      {generations.length === 0 ? (
        <p className="text-xs text-[var(--color-muted)]">
          생성 기록이 없습니다. 생성 메뉴에서 콘텐츠를 먼저 생성하십시오.
        </p>
      ) : (
        <ul className="space-y-3">
          {generations.map((g) => (
            <li
              key={g.id}
              className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm">
                    {TYPE_LABEL[g.output_type] ?? g.output_type}
                    {g.provider ? ` · ${g.provider}` : ""}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {g.brief ? g.brief.slice(0, 120) : ""}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {new Date(g.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === g.id}
                  onClick={() => reverify(g.id)}
                  className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busyId === g.id ? "재검증 중..." : "재검증"}
                </button>
              </div>
              {results[g.id] ? <AnalysisResultView result={results[g.id]!} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
