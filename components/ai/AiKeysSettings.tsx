"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { AI_PROVIDERS, DEFAULT_AI_PROVIDER, type AiProviderId } from "@/lib/constants";

interface AiKeyMeta {
  id: string;
  provider: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

const PROVIDER_LABEL: Record<string, string> = Object.fromEntries(
  AI_PROVIDERS.map((p) => [p.id, p.label]),
);

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `요청 실패 (HTTP ${res.status})`);
  return data;
}

export function AiKeysSettings() {
  const [keys, setKeys] = useState<AiKeyMeta[]>([]);
  const [provider, setProvider] = useState<AiProviderId>(DEFAULT_AI_PROVIDER);
  const [label, setLabel] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    jsonFetch<{ keys: AiKeyMeta[] }>("/api/ai-keys")
      .then((d) => setKeys(d.keys))
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

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">AI API 키</h1>
      <p className="text-xs text-[var(--color-muted)]">
        모든 키는 서버 사이드에 암호화하여 저장됩니다. 키 값은 다시 표시되지 않습니다. 키가 2개 이상이면 분석 시 교차 검증(토론) 구조로 확장됩니다.
      </p>
      {message ? <p className="text-xs text-green-400">{message}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">키 추가</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="block text-xs">제공자</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProviderId)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs">이름(선택)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs">키 값</label>
            <input
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              className="w-72 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={pending || !keyValue.trim()}
            onClick={() =>
              run(async () => {
                await jsonFetch("/api/ai-keys", {
                  method: "POST",
                  body: JSON.stringify({ provider, label, key: keyValue }),
                });
                setKeyValue("");
                setLabel("");
              }, "AI API 키를 추가했습니다.")
            }
            className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">등록된 키 ({keys.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)] text-left text-xs text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">제공자</th>
                <th className="px-3 py-2">이름</th>
                <th className="px-3 py-2">등록일</th>
                <th className="px-3 py-2">작업</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2">{PROVIDER_LABEL[k.provider] ?? k.provider}</td>
                  <td className="px-3 py-2">{k.label ?? "-"}</td>
                  <td className="px-3 py-2">
                    {new Date(k.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            jsonFetch(`/api/ai-keys/${k.id}`, { method: "DELETE" }),
                          "키를 삭제했습니다.",
                        )
                      }
                      className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-[var(--color-surface)]"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-xs text-[var(--color-muted)]">
                    등록된 키가 없습니다. Gemini 키를 먼저 추가하십시오.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
