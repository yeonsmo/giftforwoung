"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import type { Role } from "@/lib/constants";

interface KeyMeta {
  configured: boolean;
  superAdminLocked: boolean;
  updatedAt: string | null;
}

interface Status {
  hasData: boolean;
  firstCollectedAt: string | null;
  lastCollectedAt: string | null;
  totalCount: number;
  intervalDays: number;
  daysSinceLast: number | null;
  updateDue: boolean;
}

interface CollectResult {
  totalRows: number;
  perCategory: Record<string, number>;
  errors: string[];
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `요청 실패 (HTTP ${res.status})`);
  return data;
}

function fmt(date: string | null): string {
  return date ? new Date(date).toLocaleString("ko-KR") : "없음";
}

export function LegislationSettings({ callerRole }: { callerRole: Role }) {
  const [keyMeta, setKeyMeta] = useState<KeyMeta | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collectResult, setCollectResult] = useState<CollectResult | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      jsonFetch<KeyMeta>("/api/legislation/key"),
      jsonFetch<Status>("/api/legislation/status"),
    ])
      .then(([k, s]) => {
        setKeyMeta(k);
        setStatus(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function run(action: () => Promise<void>, ok: string) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(ok);
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  const locked = keyMeta?.superAdminLocked && callerRole !== "super_admin";

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">법령 데이터 설정</h1>
      {message ? <p className="text-xs text-green-400">{message}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">법제처 API 키</h2>
        <p className="text-xs text-[var(--color-muted)]">
          상태: {keyMeta?.configured ? "설정됨" : "설정되지 않음"}
          {keyMeta?.configured ? ` (갱신: ${fmt(keyMeta.updatedAt)})` : ""}
          {keyMeta?.superAdminLocked ? " · 최고권한자 보호됨" : ""}
        </p>
        {locked ? (
          <p className="text-xs text-[var(--color-muted)]">
            최고권한자가 설정한 키입니다. 관리자는 변경하거나 삭제할 수 없습니다.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="block text-xs">키 입력 / 교체</label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="법제처 OPEN API 키 (OC)"
                className="w-72 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={pending || !keyInput.trim()}
              onClick={() =>
                run(async () => {
                  await jsonFetch("/api/legislation/key", {
                    method: "PUT",
                    body: JSON.stringify({ key: keyInput }),
                  });
                  setKeyInput("");
                }, "법제처 API 키를 저장했습니다.")
              }
              className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              저장
            </button>
            {keyMeta?.configured ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      jsonFetch("/api/legislation/key", { method: "DELETE" }),
                    "법제처 API 키를 삭제했습니다.",
                  )
                }
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface)]"
              >
                삭제
              </button>
            ) : null}
          </div>
        )}
        <p className="text-xs text-[var(--color-muted)]">
          키 관리는 91일 업데이트 카운터와 독립적으로 동작합니다. 키를 삭제해도 카운터와 기존 수집 데이터에는 영향이 없으며, 분석 기능은 계속 동작합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">수집 상태 (91일 카운터)</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <dt className="text-xs text-[var(--color-muted)]">최초 수집일</dt>
            <dd>{fmt(status?.firstCollectedAt ?? null)}</dd>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <dt className="text-xs text-[var(--color-muted)]">최종 수집일</dt>
            <dd>{fmt(status?.lastCollectedAt ?? null)}</dd>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <dt className="text-xs text-[var(--color-muted)]">수집 건수</dt>
            <dd>{status?.totalCount ?? 0}</dd>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <dt className="text-xs text-[var(--color-muted)]">
              경과일 / 주기
            </dt>
            <dd>
              {status?.daysSinceLast ?? "-"} / {status?.intervalDays ?? "-"}일
              {status?.updateDue ? " · 업데이트 필요" : ""}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await jsonFetch<CollectResult>(
                "/api/legislation/collect",
                { method: "POST" },
              );
              setCollectResult(result);
            }, "법령 데이터 수집을 완료했습니다.")
          }
          className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "수집 중..." : "지금 수집"}
        </button>
      </section>

      {collectResult ? (
        <section className="space-y-2 text-sm">
          <h2 className="text-sm font-semibold">수집 결과</h2>
          <p>총 {collectResult.totalRows}건 저장</p>
          <ul className="space-y-1 text-xs text-[var(--color-muted)]">
            {Object.entries(collectResult.perCategory).map(([cat, n]) => (
              <li key={cat}>
                {cat}: {n}건
              </li>
            ))}
          </ul>
          {collectResult.errors.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs text-red-400">오류 {collectResult.errors.length}건:</p>
              <ul className="space-y-1 text-xs text-red-400">
                {collectResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
