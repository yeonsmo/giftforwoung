"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

interface InstagramStatus {
  configured: boolean;
  featureFlag: boolean;
  toggle: boolean;
  active: boolean;
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

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="text-xs">
      <span className={ok ? "text-green-400" : "text-[var(--color-muted)]"}>
        [{ok ? "완료" : "대기"}]
      </span>{" "}
      {label}
    </li>
  );
}

export function InstagramPanel({ isAdmin }: { isAdmin: boolean }) {
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    jsonFetch<InstagramStatus>("/api/instagram/status")
      .then(setStatus)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setToggle(enabled: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const next = await jsonFetch<InstagramStatus>("/api/instagram/toggle", {
          method: "PUT",
          body: JSON.stringify({ enabled }),
        });
        setStatus(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">인스타그램 자동 업로드</h1>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      {status && !status.active ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm font-semibold">현재 구현되지 않은 기능입니다.</p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            인스타그램 자동 업로드 백엔드(인증 토큰 관리, 미디어 컨테이너 생성, 게시, 스케줄러)는 완전히 구현되어 있으나 동결 상태입니다. 아래 조건을 모두 충족하면 즉시 활성화됩니다.
          </p>
        </div>
      ) : null}

      {status?.active ? (
        <p className="text-sm text-green-400">
          기능이 활성화되었습니다. 게시 및 스케줄 API를 사용할 수 있습니다.
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">활성화 조건</h2>
        <ul className="space-y-1">
          <Check ok={status?.configured ?? false} label="환경변수 자격증명(앱 ID/시크릿, 액세스 토큰, 비즈니스 계정 ID)" />
          <Check ok={status?.featureFlag ?? false} label="기능 플래그(FEATURE_INSTAGRAM_ENABLED=true)" />
          <Check ok={status?.toggle ?? false} label="메뉴 토글 활성화" />
        </ul>
      </section>

      {isAdmin ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">메뉴 토글</h2>
          <button
            type="button"
            disabled={pending}
            onClick={() => setToggle(!(status?.toggle ?? false))}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface)] disabled:opacity-50"
          >
            {status?.toggle ? "토글 비활성화" : "토글 활성화"}
          </button>
          <p className="text-xs text-[var(--color-muted)]">
            토글을 켜더라도 자격증명과 기능 플래그가 없으면 동결 상태가 유지됩니다.
          </p>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Meta API 외부 제약</h2>
        <p className="text-xs text-[var(--color-muted)]">
          Instagram Graph API 게시는 비즈니스 또는 크리에이터 계정, Facebook 페이지 연동, 그리고 Meta 앱 심사(instagram_content_publish 권한) 통과가 필요합니다. 이 제약은 외부 플랫폼 정책이며 본 애플리케이션 외부에서 충족해야 합니다.
        </p>
      </section>
    </div>
  );
}
