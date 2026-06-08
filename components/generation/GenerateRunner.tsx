"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProviderAvailability {
  id: string;
  label: string;
  configured: boolean;
}

interface GenerationConfig {
  copywriting: { available: boolean };
  image: { available: boolean; providers: ProviderAvailability[] };
  video: { available: boolean; providers: ProviderAvailability[] };
}

type Result =
  | { outputType: "copywriting"; provider: string; text: string }
  | { outputType: "image"; provider: string; imageDataUrl: string }
  | {
      outputType: "video";
      provider: string;
      status: string;
      reference: string | null;
      raw: unknown;
    };

interface UploadTarget {
  bucket: string;
  path: string;
  token: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `요청 실패 (HTTP ${res.status})`);
  return data;
}

function download(filename: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export function GenerateRunner() {
  const [config, setConfig] = useState<GenerationConfig | null>(null);
  const [outputType, setOutputType] = useState<"copywriting" | "image" | "video">(
    "copywriting",
  );
  const [provider, setProvider] = useState("");
  const [brief, setBrief] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/generation/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: GenerationConfig | null) => setConfig(c))
      .catch(() => setError("생성 설정을 불러오지 못했습니다."));
  }, []);

  const imageProviders = config?.image.providers.filter((p) => p.configured) ?? [];
  const videoProviders = config?.video.providers.filter((p) => p.configured) ?? [];

  async function run() {
    if (!brief.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      let media: Partial<UploadTarget> & { mimeType?: string } = {};
      if (file) {
        setStatus("참조 파일 업로드 중...");
        const target = await postJson<UploadTarget>("/api/uploads", {
          filename: file.name,
        });
        const supabase = createClient();
        const { error: upErr } = await supabase.storage
          .from(target.bucket)
          .uploadToSignedUrl(target.path, target.token, file);
        if (upErr) throw new Error(upErr.message);
        media = { bucket: target.bucket, path: target.path, mimeType: file.type };
      }

      setStatus("생성 중...");
      const payload = {
        outputType,
        provider: outputType === "copywriting" ? undefined : provider,
        brief,
        ...media,
      };
      const res = await postJson<Result>("/api/generation", payload);
      setResult(res);
      setStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  function OutputOption({
    value,
    label,
    available,
  }: {
    value: typeof outputType;
    label: string;
    available: boolean;
  }) {
    return (
      <label
        className={`flex items-center gap-2 text-sm ${available ? "" : "text-[var(--color-muted)]"}`}
      >
        <input
          type="radio"
          name="outputType"
          checked={outputType === value}
          disabled={!available}
          onChange={() => {
            setOutputType(value);
            setProvider("");
          }}
        />
        {label}
        {available ? "" : " (키 입력 필요)"}
      </label>
    );
  }

  const providerList = outputType === "image" ? imageProviders : videoProviders;
  const needsProvider = outputType === "image" || outputType === "video";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">법령 준수 콘텐츠 생성</h1>
      <p className="text-xs text-[var(--color-muted)]">
        법령 DB를 참고하여 법령 준수를 기초로 콘텐츠를 생성합니다. 생성된 콘텐츠의 위반 여부 판별은 사용자의 책임이며, 재검증 메뉴에서 분석 엔진으로 다시 검증할 수 있습니다.
      </p>

      <div className="space-y-2">
        <p className="text-xs text-[var(--color-muted)]">출력 유형</p>
        <OutputOption
          value="copywriting"
          label="카피라이팅"
          available={config?.copywriting.available ?? false}
        />
        <OutputOption
          value="image"
          label="이미지 생성"
          available={config?.image.available ?? false}
        />
        <OutputOption
          value="video"
          label="영상 생성"
          available={config?.video.available ?? false}
        />
      </div>

      {needsProvider ? (
        <div className="space-y-1">
          <label className="block text-xs">제공자</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          >
            <option value="">선택</option>
            {providerList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-2">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="생성 브리프(요청 내용, 데이터 등)"
          rows={4}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
        />
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block text-sm"
        />
        <button
          type="button"
          disabled={busy || !brief.trim() || (needsProvider && !provider)}
          onClick={run}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "처리 중..." : "생성"}
        </button>
      </div>

      {status ? <p className="text-xs text-[var(--color-muted)]">{status}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      {result ? (
        <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
          <p className="text-xs text-[var(--color-muted)]">결과 ({result.provider})</p>
          {result.outputType === "copywriting" ? (
            <>
              <p className="whitespace-pre-wrap">{result.text}</p>
              <button
                type="button"
                onClick={() =>
                  download(
                    "copy.txt",
                    `data:text/plain;charset=utf-8,${encodeURIComponent(result.text)}`,
                  )
                }
                className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-background)]"
              >
                다운로드
              </button>
            </>
          ) : null}
          {result.outputType === "image" ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.imageDataUrl}
                alt="생성 이미지"
                className="max-w-full rounded-md border border-[var(--color-border)]"
              />
              <button
                type="button"
                onClick={() => download("image.png", result.imageDataUrl)}
                className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-background)]"
              >
                다운로드
              </button>
            </>
          ) : null}
          {result.outputType === "video" ? (
            <div className="space-y-1 text-xs">
              <p>상태: {result.status}</p>
              <p>작업 참조: {result.reference ?? "-"}</p>
              <p className="text-[var(--color-muted)]">
                영상 생성은 비동기로 처리됩니다. 작업 참조로 제공자에서 완료 후 결과를 확인하십시오.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
