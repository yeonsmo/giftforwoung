"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { IMAGE_PROVIDERS, VIDEO_PROVIDERS } from "@/lib/constants";

interface KeyMeta {
  id: string;
  provider: string;
  label: string | null;
  created_at: string;
}

interface TrendConfig {
  endpoint: string | null;
  parsing: string | null;
  keyConfigured: boolean;
}

interface ConfigResponse {
  copywriting: { available: boolean };
  trend: TrendConfig;
}

const PROVIDER_LABEL: Record<string, string> = Object.fromEntries(
  [...IMAGE_PROVIDERS, ...VIDEO_PROVIDERS].map((p) => [p.id, p.label]),
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

export function GenerationSettings() {
  const [imageKeys, setImageKeys] = useState<KeyMeta[]>([]);
  const [videoKeys, setVideoKeys] = useState<KeyMeta[]>([]);
  const [copyAvailable, setCopyAvailable] = useState(false);
  const [trend, setTrend] = useState<TrendConfig | null>(null);

  const [imageProvider, setImageProvider] = useState<string>(IMAGE_PROVIDERS[0].id);
  const [videoProvider, setVideoProvider] = useState<string>(VIDEO_PROVIDERS[0].id);
  const [imageKey, setImageKey] = useState("");
  const [videoKey, setVideoKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [parsing, setParsing] = useState("");
  const [trendKey, setTrendKey] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    Promise.all([
      jsonFetch<{ image: KeyMeta[]; video: KeyMeta[] }>("/api/generation/keys"),
      jsonFetch<ConfigResponse>("/api/generation/config"),
    ])
      .then(([keys, config]) => {
        setImageKeys(keys.image);
        setVideoKeys(keys.video);
        setCopyAvailable(config.copywriting.available);
        setTrend(config.trend);
        setEndpoint(config.trend.endpoint ?? "");
        setParsing(config.trend.parsing ?? "");
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

  function KeyTable({ keys }: { keys: KeyMeta[] }) {
    return (
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-xs text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">제공자</th>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2">{PROVIDER_LABEL[k.provider] ?? k.provider}</td>
                <td className="px-3 py-2">{k.label ?? "-"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => jsonFetch(`/api/ai-keys/${k.id}`, { method: "DELETE" }),
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
                <td colSpan={3} className="px-3 py-3 text-center text-xs text-[var(--color-muted)]">
                  등록된 키가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">생성 모델 설정</h1>
      {message ? <p className="text-xs text-green-400">{message}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">카피라이팅</h2>
        <p className="text-xs text-[var(--color-muted)]">
          카피라이팅은 AI 키 설정의 LLM 키(Gemini, OpenAI, Anthropic)를 사용합니다. 현재 상태:{" "}
          {copyAvailable ? "사용 가능" : "사용 불가 (LLM 키를 먼저 추가하십시오)"}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">이미지 생성 키</h2>
        <div className="flex flex-wrap items-end gap-3">
          <select
            value={imageProvider}
            onChange={(e) => setImageProvider(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          >
            {IMAGE_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={imageKey}
            onChange={(e) => setImageKey(e.target.value)}
            placeholder="API 키"
            className="w-64 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || !imageKey.trim()}
            onClick={() =>
              run(async () => {
                await jsonFetch("/api/generation/keys", {
                  method: "POST",
                  body: JSON.stringify({ provider: imageProvider, key: imageKey }),
                });
                setImageKey("");
              }, "이미지 키를 추가했습니다.")
            }
            className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            추가
          </button>
        </div>
        <KeyTable keys={imageKeys} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">영상 생성 키</h2>
        <div className="flex flex-wrap items-end gap-3">
          <select
            value={videoProvider}
            onChange={(e) => setVideoProvider(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          >
            {VIDEO_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={videoKey}
            onChange={(e) => setVideoKey(e.target.value)}
            placeholder="API 키"
            className="w-64 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || !videoKey.trim()}
            onClick={() =>
              run(async () => {
                await jsonFetch("/api/generation/keys", {
                  method: "POST",
                  body: JSON.stringify({ provider: videoProvider, key: videoKey }),
                });
                setVideoKey("");
              }, "영상 키를 추가했습니다.")
            }
            className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            추가
          </button>
        </div>
        <KeyTable keys={videoKeys} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">외부 트렌드 API (선택)</h2>
        <p className="text-xs text-[var(--color-muted)]">
          엔드포인트를 비워 두면 LLM의 내재 지식으로 트렌드를 반영합니다. 응답 파싱 규칙은 JSON 점 경로입니다(예: data.trends 또는 results.0.title). 키 현재 상태:{" "}
          {trend?.keyConfigured ? "설정됨" : "없음"}
        </p>
        <div className="space-y-2">
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="엔드포인트 URL"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />
          <input
            value={parsing}
            onChange={(e) => setParsing(e.target.value)}
            placeholder="응답 파싱 규칙 (점 경로)"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={trendKey}
            onChange={(e) => setTrendKey(e.target.value)}
            placeholder="트렌드 API 키 (선택, 비우면 변경 없음)"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await jsonFetch("/api/generation/trend", {
                  method: "PUT",
                  body: JSON.stringify({
                    endpoint,
                    parsing,
                    ...(trendKey ? { key: trendKey } : {}),
                  }),
                });
                setTrendKey("");
              }, "트렌드 API 설정을 저장했습니다.")
            }
            className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            트렌드 설정 저장
          </button>
        </div>
      </section>
    </div>
  );
}
