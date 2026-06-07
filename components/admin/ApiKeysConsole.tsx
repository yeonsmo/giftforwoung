"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

interface ApiKeyMeta {
  id: string;
  name: string | null;
  key_prefix: string;
  webhook_url: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
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

export function ApiKeysConsole() {
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    jsonFetch<{ keys: ApiKeyMeta[] }>("/api/admin/api-keys")
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

  function issue() {
    setMessage(null);
    setError(null);
    setIssuedToken(null);
    startTransition(async () => {
      try {
        const res = await jsonFetch<{ token: string }>("/api/admin/api-keys", {
          method: "POST",
          body: JSON.stringify({ name, webhookUrl }),
        });
        setIssuedToken(res.token);
        setName("");
        setWebhookUrl("");
        setMessage("API 키를 발급했습니다. 토큰은 지금 한 번만 표시됩니다.");
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">외부 API 키 / 웹훅</h2>
      <p className="text-xs text-[var(--color-muted)]">
        발급된 키로 외부 시스템이 분석 기능을 호출할 수 있습니다. 호출:
        POST /api/external/analysis, 헤더 Authorization: Bearer 또는 x-api-key. 웹훅 URL을 지정하면 분석 결과를 서명(HMAC-SHA256)하여 전달합니다.
      </p>
      {message ? <p className="text-xs text-green-400">{message}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      {issuedToken ? (
        <div className="rounded-md border border-[var(--color-accent)] bg-[var(--color-background)] p-3">
          <p className="text-xs text-[var(--color-muted)]">
            발급된 토큰(한 번만 표시, 안전하게 보관):
          </p>
          <code className="break-all text-sm">{issuedToken}</code>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="block text-xs">이름(선택)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs">웹훅 URL(선택)</label>
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            className="w-72 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={issue}
          className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          키 발급
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-xs text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">접두사</th>
              <th className="px-3 py-2">웹훅</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">최근 사용</th>
              <th className="px-3 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2">{k.name ?? "-"}</td>
                <td className="px-3 py-2">{k.key_prefix}...</td>
                <td className="px-3 py-2 text-xs">{k.webhook_url ?? "-"}</td>
                <td className="px-3 py-2">{k.is_active ? "활성" : "폐기됨"}</td>
                <td className="px-3 py-2 text-xs">
                  {k.last_used_at ? new Date(k.last_used_at).toLocaleString("ko-KR") : "-"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            jsonFetch(`/api/admin/api-keys/${k.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ is_active: !k.is_active }),
                            }),
                          k.is_active ? "키를 폐기했습니다." : "키를 활성화했습니다.",
                        )
                      }
                      className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-surface)]"
                    >
                      {k.is_active ? "폐기" : "활성화"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            jsonFetch(`/api/admin/api-keys/${k.id}`, { method: "DELETE" }),
                          "키를 삭제했습니다.",
                        )
                      }
                      className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-[var(--color-surface)]"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-3 text-center text-xs text-[var(--color-muted)]">
                  발급된 키가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
