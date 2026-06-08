"use client";

import { useEffect, useState } from "react";

interface Status {
  updateDue: boolean;
  daysSinceLast: number | null;
  intervalDays: number;
}

const DISMISS_KEY = "legislation_update_dismissed";

/**
 * 91-day update popup (spec 3-3). On access, checks the counter status and, when
 * an update is due, prompts "데이터를 업데이트 하시겠습니까?". "예" runs a
 * collection; "아니요" dismisses for the session. Rendered only for Admin+ since
 * collection requires those privileges.
 */
export function LegislationUpdatePopup() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    fetch("/api/legislation/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Status | null) => {
        if (s?.updateDue) setOpen(true);
      })
      .catch(() => {
        // Status unavailable; do not show the popup.
      });
  }, []);

  if (!open) return null;

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  async function update() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/legislation/collect", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        totalRows?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `요청 실패 (HTTP ${res.status})`);
      setDone(`업데이트 완료: 총 ${data.totalRows ?? 0}건 수집되었습니다.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-sm font-semibold">법령 데이터 업데이트</h2>
        <p className="text-sm text-[var(--color-muted)]">
          최종 수집 후 91일이 경과했습니다. 데이터를 업데이트 하시겠습니까?
        </p>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        {done ? <p className="text-xs text-green-400">{done}</p> : null}
        <div className="flex justify-end gap-2">
          {done ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white"
            >
              닫기
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={dismiss}
                disabled={busy}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-background)] disabled:opacity-50"
              >
                아니요
              </button>
              <button
                type="button"
                onClick={update}
                disabled={busy}
                className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "업데이트 중..." : "예"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
