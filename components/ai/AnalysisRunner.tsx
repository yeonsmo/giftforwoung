"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AnalysisResultView,
  type AnalysisResult,
} from "@/components/ai/AnalysisResultView";

interface UploadTarget {
  provider: string;
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

export function AnalysisRunner({
  heading = "법령 위반 분석",
  description = "사진 또는 영상을 업로드하면 Vision LLM이 수집된 법령 데이터와 대조하여 위반 여부를 판별합니다. 영상 등 대용량 파일은 Cloud Storage에 직접 업로드됩니다.",
}: {
  heading?: string;
  description?: string;
} = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      // 1. Get a signed upload target (keeps large files off the function).
      setStatus("업로드 준비 중...");
      const target = await postJson<UploadTarget>("/api/uploads", {
        filename: file.name,
      });

      // 2. Upload directly to Cloud Storage from the browser.
      setStatus("파일 업로드 중...");
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(target.bucket)
        .uploadToSignedUrl(target.path, target.token, file);
      if (uploadError) throw new Error(uploadError.message);

      // 3. Run the analysis (server fetches the media and calls the model).
      setStatus("분석 중...");
      const mediaKind = file.type.startsWith("video/") ? "video" : "image";
      const analysis = await postJson<AnalysisResult>("/api/analysis", {
        bucket: target.bucket,
        path: target.path,
        mimeType: file.type,
        mediaKind,
        note,
      });
      setResult(analysis);
      setStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{heading}</h1>
      <p className="text-xs text-[var(--color-muted)]">{description}</p>

      <div className="space-y-3">
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block text-sm"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="추가 참고 사항(선택)"
          rows={2}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy || !file}
          onClick={run}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "처리 중..." : "분석 실행"}
        </button>
      </div>

      {status ? <p className="text-xs text-[var(--color-muted)]">{status}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {result ? <AnalysisResultView result={result} /> : null}
    </div>
  );
}
